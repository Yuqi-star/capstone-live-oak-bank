from flask import Flask, render_template, request, redirect, url_for, jsonify, session, send_from_directory, send_file
import sqlite3
import os
from news_fetcher import get_news
from config import DB_PATH, CREDIT_RISK_DB_PATH, DEFAULT_INDUSTRIES, HEALTHCARE_SUB_INDUSTRIES, SOLAR_ENERGY_SUB_INDUSTRIES, TECHNOLOGY_SUB_INDUSTRIES, AI_SUB_INDUSTRIES, CREDIT_RISK_DATA_DB_PATH, NEWS_CACHE_FILE, REPORT_DIR
import secrets
from datetime import timedelta, datetime
import csv
import pandas as pd
import uuid
import json
from dotenv import load_dotenv
import random
from report_generator import ReportGenerator
from celery import Celery

# Get the directory containing this file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load environment variables from .env file
env_path = os.path.join(BASE_DIR, '.env')
load_dotenv(env_path)

app = Flask(__name__)
# Add secret key for session encryption
app.secret_key = secrets.token_hex(16)

# Add configuration
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['REPORT_DIR'] = REPORT_DIR
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['TEMPLATE_DIR'] = os.path.join(BASE_DIR, 'templates')
# Add additional configurations for file handling
app.config['UPLOAD_FOLDER'] = os.path.join(BASE_DIR, 'uploads')
app.config['ALLOWED_EXTENSIONS'] = {'pdf', 'xlsx', 'html'}
# Ensure file download works properly
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

# Create reports directory if it doesn't exist
os.makedirs(app.config['REPORT_DIR'], exist_ok=True)
# Create uploads directory if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize Celery with Redis
celery = Celery(app.name, broker='redis://localhost:6379/0', backend='redis://localhost:6379/0')
celery.conf.update(app.config)

# Initialize database if it doesn't exist
def init_db():
    # Initialize users database
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Users table
    c.execute('''CREATE TABLE IF NOT EXISTS users 
                 (id INTEGER PRIMARY KEY,
                  username TEXT UNIQUE,
                  password TEXT,
                  first_name TEXT,
                  last_name TEXT)''')
                  
    # User custom industries table
    c.execute('''CREATE TABLE IF NOT EXISTS user_industries
                 (id INTEGER PRIMARY KEY,
                  user_id INTEGER,
                  industry_name TEXT,
                  added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (user_id) REFERENCES users(id),
                  UNIQUE(user_id, industry_name))''')
    
    conn.commit()
    conn.close()
    
    # Initialize credit risk database
    conn = sqlite3.connect(CREDIT_RISK_DB_PATH)
    c = conn.cursor()
    
    # Credit Risk table
    c.execute('''CREATE TABLE IF NOT EXISTS credit_risk (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        Company TEXT NOT NULL,
        Industry TEXT,
        "Sub-Industry" TEXT,
        "Credit Rating" TEXT,
        "Probability of Default" REAL,
        "Loss Given Default" REAL,
        "Expected Loss" REAL,
        "Current Ratio" REAL,
        "ROA" REAL,
        "ROE" REAL,
        "Leverage Ratio" REAL,
        "Credit VaR" REAL,
        "Loan Amount" REAL,
        "Debt Service Coverage Ratio" REAL,
        "Probability of Credit Rating Change" REAL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )''')
    
    # Create indexes
    c.execute('CREATE INDEX IF NOT EXISTS idx_credit_risk_company ON credit_risk(Company)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_credit_risk_industry ON credit_risk(Industry)')
    
    conn.commit()
    conn.close()
    
    # Initialize credit risk data if table is empty
    conn = sqlite3.connect(CREDIT_RISK_DB_PATH)
    c = conn.cursor()
    c.execute('SELECT COUNT(*) FROM credit_risk')
    count = c.fetchone()[0]
    conn.close()
    
    if count == 0:
        from init_credit_risk_data import init_credit_risk_data
        init_credit_risk_data()

# Initialize database
init_db()

# Validate user login
def validate_user(username, password):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE username = ? AND password = ?", (username, password))
    user = c.fetchone()
    conn.close()
    return user

# Register new user
def register_user(username, password, first_name, last_name):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute("INSERT INTO users (username, password, first_name, last_name) VALUES (?, ?, ?, ?)", 
                 (username, password, first_name, last_name))
        conn.commit()
        return True
    except sqlite3.IntegrityError:  # Username already exists
        return False
    finally:
        conn.close()

@app.route('/')
def home():
    # If user is already logged in, redirect to dashboard
    if 'username' in session:
        return redirect(url_for('dashboard', username=session['username']))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    # If user is already logged in, redirect to dashboard
    if 'username' in session:
        return redirect(url_for('dashboard', username=session['username']))
        
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        remember = request.form.get('remember') == 'on'
        
        if validate_user(username, password):
            # If "remember me" is selected, set session expiration to 30 days
            if remember:
                session.permanent = True
                app.permanent_session_lifetime = timedelta(days=30)
            
            # Save username to session
            session['username'] = username
            return redirect(url_for('dashboard', username=username))
        return render_template('login.html', error="Invalid credentials")
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        first_name = request.form['first_name']
        last_name = request.form['last_name']

        if register_user(username, password, first_name, last_name):
            return redirect(url_for('login'))
        return render_template('register.html', error="Username already exists")

    return render_template('register.html')

@app.route('/add_industry', methods=['POST'])
def add_industry():
    username = request.args.get('username')
    if not username:
        return jsonify({"error": "Not logged in"}), 401
        
    industry = request.form.get('industry')
    if not industry:
        return jsonify({"error": "No industry provided"}), 400
        
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        # Get user ID
        c.execute("SELECT id FROM users WHERE username = ?", (username,))
        user_id = c.fetchone()[0]
        
        # Add industry
        c.execute("INSERT OR IGNORE INTO user_industries (user_id, industry_name) VALUES (?, ?)",
                 (user_id, industry))
        conn.commit()
        return jsonify({"success": True, "industry": industry})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# Get all user industries
def get_user_industries(username):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        SELECT industry_name FROM user_industries 
        WHERE user_id = (SELECT id FROM users WHERE username = ?)
    """, (username,))
    custom_industries = [row[0] for row in c.fetchall()]
    conn.close()
    return custom_industries

@app.route('/dashboard')
def dashboard():
    # Check if logged in
    if 'username' not in session:
        return redirect(url_for('login'))
    
    username = session['username']
    # Get all industries (default + custom)
    custom_industries = get_user_industries(username)
    
    # Create a structured industry hierarchy
    industry_structure = {
        "Healthcare": HEALTHCARE_SUB_INDUSTRIES,
        "Solar Energy": SOLAR_ENERGY_SUB_INDUSTRIES,
        "Technology": TECHNOLOGY_SUB_INDUSTRIES,
        "AI": AI_SUB_INDUSTRIES
    }
    
    # Flatten all industries for news fetching
    all_industries = DEFAULT_INDUSTRIES + HEALTHCARE_SUB_INDUSTRIES + SOLAR_ENERGY_SUB_INDUSTRIES + TECHNOLOGY_SUB_INDUSTRIES + AI_SUB_INDUSTRIES + custom_industries
    
    # Get selected industries from URL parameters
    selected_industries = request.args.getlist('industries')
    
    # Get search query
    search_query = request.args.get('search', '')
    
    # Only select all industries by default when first entering (no parameters)
    # If there's a search query, don't auto-select industries
    # If URL has parameters but no industry parameters, user manually deselected all industries, respect user's choice
    if not selected_industries and not request.args:
        selected_industries = all_industries
        # Redirect to URL with all industry parameters to ensure correct news filtering
        params = request.args.copy()
        for industry in all_industries:
            params.add('industries', industry)
        return redirect(url_for('dashboard', **params))
    
    # If there's a search query but no selected industries, search all news
    news_articles = get_news(
        industries=selected_industries if not search_query else None,
        search_query=search_query if search_query else None
    )
    
    # Check if this is an AJAX request
    is_ajax = request.args.get('ajax', 'false') == 'true'
    
    # Render the template with the appropriate layout
    if is_ajax:
        # For AJAX requests, only render the content part
        return render_template('dashboard_content.html',
                             username=username,
                             news=news_articles,
                             industries=all_industries,
                             default_industries=DEFAULT_INDUSTRIES,
                             selected_industries=selected_industries,
                             search_query=search_query,
                             industry_structure=industry_structure,
                             now=datetime.now())
    else:
        # For regular requests, render the full page
        return render_template('dashboard.html',
                             username=username,
                             news=news_articles,
                             industries=all_industries,
                             default_industries=DEFAULT_INDUSTRIES,
                             selected_industries=selected_industries,
                             search_query=search_query,
                             industry_structure=industry_structure,
                             now=datetime.now())

@app.route('/companies')
def companies():
    # Check if logged in
    if 'username' not in session:
        return redirect(url_for('login'))
    
    username = session['username']
    
    # Get search query and filter criteria
    search_query = request.args.get('search', '')
    risk_filter = request.args.get('risk', '')
    
    print(f"Search query: '{search_query}', Risk filter: '{risk_filter}'")
    
    # Read credit risk data from database
    print(f"Using database path: {CREDIT_RISK_DB_PATH}")
    conn = sqlite3.connect(CREDIT_RISK_DB_PATH)
    c = conn.cursor()
    
    try:
        # Check if credit_risk table exists
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='credit_risk'")
        table_exists = c.fetchone()
        print(f"credit_risk table exists: {table_exists is not None}")
        
        if table_exists:
            # Read credit risk data
            c.execute("SELECT COUNT(*) FROM credit_risk")
            count = c.fetchone()[0]
            print(f"Number of records in credit_risk table: {count}")
            
            c.execute("SELECT * FROM credit_risk LIMIT 5")
            sample_data = c.fetchall()
            print(f"Sample data: {sample_data}")
            
            c.execute("SELECT * FROM credit_risk")
            columns = [column[0] for column in c.description]
            companies_data = []
            
            for row in c.fetchall():
                company_data = {}
                for i, column in enumerate(columns):
                    company_data[column] = row[i]
                
                # Add risk rating
                pd = company_data.get('Probability of Default', 0)
                if pd < 0.01:
                    company_data['risk_level'] = 'low'
                elif pd < 0.05:
                    company_data['risk_level'] = 'medium'
                else:
                    company_data['risk_level'] = 'high'
                
                # Add Loss Given Default (LGD) - typically ranges from 0.3 to 0.6 depending on risk level
                if company_data['risk_level'] == 'low':
                    company_data['Loss Given Default'] = 0.35
                elif company_data['risk_level'] == 'medium':
                    company_data['Loss Given Default'] = 0.45
                else:  # high risk
                    company_data['Loss Given Default'] = 0.55
                
                # Ensure Debt Service Coverage Ratio is properly formatted
                if 'Debt Service Coverage Ratio' in company_data:
                    company_data['Debt Service Coverage Ratio'] = float(company_data['Debt Service Coverage Ratio'])
                else:
                    # Calculate Debt Service Coverage Ratio if not present
                    # This is typically EBIT / Interest Expenses, but we'll use a simplified calculation
                    roa = company_data.get('ROA', 0)
                    leverage = company_data.get('Leverage Ratio', 0.5)
                    company_data['Debt Service Coverage Ratio'] = round((1 + roa) / (leverage + 0.1), 2)
                
                # Add operating income data for DSCR calculations
                loan_amount = company_data.get('Loan Amount', 1000000)
                roa = company_data.get('ROA', 0)
                company_data['Net Operating Income'] = round(loan_amount * roa * 1.5, 2)
                
                # Add total debt service estimate for DSCR calculations
                leverage = company_data.get('Leverage Ratio', 0.5)
                company_data['Total Debt Service'] = round(loan_amount * leverage * 0.12, 2)
                
                # Recalculate Expected Loss using PD * LGD * Exposure
                # If Exposure/Loan Amount is not available, use a default value or the existing Expected Loss
                lgd = company_data.get('Loss Given Default', 0.45)
                exposure = company_data.get('Loan Amount', 1000000)  # Default to 1M if not available
                
                # Update Expected Loss calculation
                if 'Expected Loss' in company_data:
                    # Recalculate using the new LGD value
                    company_data['Expected Loss'] = pd * lgd * exposure
                    
                companies_data.append(company_data)
            
            print(f"Number of processed company records: {len(companies_data)}")
            
            # Print all company names for debugging
            company_names = [c.get('Company', 'Unknown') for c in companies_data]
            print(f"Company name list: {company_names[:10]}...")  # Only print first 10
            
        else:
            companies_data = []
    except Exception as e:
        print(f"Error fetching company data: {e}")
        companies_data = []
    finally:
        conn.close()
    
    # Apply filters
    if search_query:
        print(f"Starting search: '{search_query}'")
        filtered_companies = []
        search_query_lower = search_query.lower()
        
        # Check if it's an exact search (e.g., Company_1)
        is_exact_company_search = search_query_lower.startswith("company_") and search_query_lower[8:].isdigit()
        
        for company in companies_data:
            company_name = company.get('Company', '')
            industry = company.get('Industry', '')
            sub_industry = company.get('Sub-Industry', '')
            credit_rating = str(company.get('Credit Rating', ''))
            
            # Exact match for company name
            if is_exact_company_search and company_name.lower() == search_query_lower:
                print(f"Exact match for company name: {company_name}")
                filtered_companies.append(company)
                continue
            
            # Skip fuzzy matching if exact search but no exact match
            if is_exact_company_search:
                continue
                
            # Search company name (fuzzy match)
            if company_name and search_query_lower in company_name.lower():
                print(f"Matching company name: {company_name}")
                filtered_companies.append(company)
                continue
                
            # Search industry
            if industry and search_query_lower in industry.lower():
                print(f"Matching industry: {industry}")
                filtered_companies.append(company)
                continue
                
            # Search sub-industry
            if sub_industry and search_query_lower in sub_industry.lower():
                print(f"Matching sub-industry: {sub_industry}")
                filtered_companies.append(company)
                continue
                
            # Search credit rating
            if credit_rating and search_query_lower in credit_rating.lower():
                print(f"Matching credit rating: {credit_rating}")
                filtered_companies.append(company)
                continue
        
        print(f"Number of search results: {len(filtered_companies)}")
        companies_data = filtered_companies
    
    if risk_filter:
        print(f"Applying risk filter: {risk_filter}")
        companies_data = [c for c in companies_data if c.get('risk_level') == risk_filter]
        print(f"Number of results after risk filtering: {len(companies_data)}")
    
    # Sort by default probability (high to low)
    companies_data = sorted(companies_data, key=lambda x: x.get('Probability of Default', 0), reverse=True)
    
    print(f"Final number of company records returned: {len(companies_data)}")
    
    # Check if this is an AJAX request
    is_ajax = request.args.get('ajax', 'false') == 'true'
    
    # Render the template with the appropriate layout
    if is_ajax:
        # For AJAX requests, only render the content part
        return render_template('companies_content.html',
                             username=username,
                             companies=companies_data,
                             search_query=search_query,
                             risk_filter=risk_filter,
                             now=datetime.now())
    else:
        # For regular requests, render the full page
        return render_template('companies.html',
                             username=username,
                             companies=companies_data,
                             search_query=search_query,
                             risk_filter=risk_filter,
                             now=datetime.now())

@app.route('/logout')
def logout():
    # Clear session
    session.clear()
    return redirect(url_for('login'))

# Delete custom industry
@app.route('/delete_industry', methods=['POST'])
def delete_industry():
    username = request.args.get('username')
    if not username:
        return jsonify({"error": "Not logged in"}), 401
        
    industry = request.form.get('industry')
    if not industry:
        return jsonify({"error": "No industry provided"}), 400
        
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        # Get user ID
        c.execute("SELECT id FROM users WHERE username = ?", (username,))
        user_id = c.fetchone()[0]
        
        # Check if it's a default industry
        if industry in DEFAULT_INDUSTRIES:
            return jsonify({"error": "Cannot delete default industry"}), 400
            
        # Delete industry
        c.execute("DELETE FROM user_industries WHERE user_id = ? AND industry_name = ?",
                 (user_id, industry))
        conn.commit()
        return jsonify({"success": True, "industry": industry})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/company_profiles')
def company_profiles():
    # Check if logged in
    if 'username' not in session:
        return redirect(url_for('login'))
    
    username = session['username']
    
    # Read company data from CSV file - UPDATED to use company_info_updated.csv
    csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'company_info_updated.csv')
    
    try:
        # Use pandas to read CSV file
        df = pd.read_csv(csv_path)
        # Filter out the first row (header row)
        companies_data = df[df['Category'] != 'Category'].to_dict('records')
        
        # Add industry category labels for each company
        for company in companies_data:
            industry = company.get('Industry', '')
            company_name = company.get('Company Name', '')
            
            # Updated categorization based on new data
            if 'Electrical/Electronic Manufacturing' in industry:
                company['industry_category'] = 'Manufacturing'
                company['industry_color'] = 'manufacturing'
                company['sub_industry'] = 'Electrical/Electronic Manufacturing'
            elif '621610' in industry or 'Home Health Care Services' in industry:
                company['industry_category'] = 'Healthcare'
                company['industry_color'] = 'healthcare'
                company['sub_industry'] = 'Home Health Care Services'
            elif '237130' in industry or 'Solar' in industry:
                company['industry_category'] = 'Solar Energy'
                company['industry_color'] = 'solar'
                company['sub_industry'] = 'Solar EPC & Construction'
            else:
                company['industry_category'] = 'Other'
                company['industry_color'] = 'other'
                company['sub_industry'] = industry
    except Exception as e:
        print(f"Error reading company profiles: {e}")
        companies_data = []
    
    # Get search query and filter criteria
    search_query = request.args.get('search', '')
    industry_filter = request.args.get('industry', '')
    
    # Apply filters
    if search_query:
        companies_data = [c for c in companies_data if search_query.lower() in c.get('Company Name', '').lower()]
    
    if industry_filter:
        companies_data = [c for c in companies_data if industry_filter.lower() in c.get('industry_category', '').lower()]
    
    # Check if this is an AJAX request
    is_ajax = request.args.get('ajax', 'false') == 'true'
    
    # Render the template with the appropriate layout
    if is_ajax:
        # For AJAX requests, only render the content part
        return render_template('company_profiles_content.html',
                             username=username,
                             companies=companies_data,
                             search_query=search_query,
                             industry_filter=industry_filter,
                             now=datetime.now())
    else:
        # For regular requests, render the full page
        return render_template('company_profiles.html',
                             username=username,
                             companies=companies_data,
                             search_query=search_query,
                             industry_filter=industry_filter,
                             now=datetime.now())

# Alert and Report Routes
@app.route('/api/set_alert', methods=['POST'])
def set_alert():
    """Set an alert for a specific company metric."""
    if 'username' not in session:
        return jsonify({"success": False, "message": "Not logged in"}), 401
    
    try:
        # Get request data
        data = request.json
        print("Received alert data:", data)  # 调试日志
        
        company_name = data.get('company_name')
        metric = data.get('metric')
        condition = data.get('condition')
        threshold = data.get('threshold')
        notify_email = data.get('notify_email', False)
        notify_sms = data.get('notify_sms', False)
        notify_dashboard = data.get('notify_dashboard', True)
        email = data.get('email')
        phone = data.get('phone')
        
        # Validate required fields
        if not all([company_name, metric, condition, threshold is not None]):
            return jsonify({"success": False, "message": "Missing required fields"}), 400
        
        # Validate notification methods
        if not any([notify_email, notify_sms, notify_dashboard]):
            return jsonify({"success": False, "message": "At least one notification method is required"}), 400
        
        # Validate email and phone if selected
        if notify_email and not email:
            return jsonify({"success": False, "message": "Email address is required for email notifications"}), 400
        
        if notify_sms and not phone:
            return jsonify({"success": False, "message": "Phone number is required for SMS notifications"}), 400
        
        # Get user ID
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT id FROM users WHERE username = ?", (session['username'],))
        user_result = c.fetchone()
        if not user_result:
            conn.close()
            return jsonify({"success": False, "message": "User not found"}), 404
            
        user_id = user_result[0]
        conn.close()
        
        # Create alerts table if it doesn't exist
        conn = sqlite3.connect(CREDIT_RISK_DB_PATH)
        c = conn.cursor()
        c.execute('''
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            company_name TEXT NOT NULL,
            metric TEXT NOT NULL,
            condition TEXT NOT NULL,
            threshold REAL NOT NULL,
            notify_email BOOLEAN,
            notify_sms BOOLEAN,
            notify_dashboard BOOLEAN,
            email TEXT,
            phone TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_checked_at TIMESTAMP,
            last_triggered_at TIMESTAMP
        )
        ''')
        conn.commit()
        
        # Insert alert
        c.execute('''
        INSERT INTO alerts 
        (user_id, company_name, metric, condition, threshold, notify_email, notify_sms, notify_dashboard, email, phone)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            user_id, company_name, metric, condition, threshold, 
            notify_email, notify_sms, notify_dashboard, email, phone
        ))
        
        conn.commit()
        alert_id = c.lastrowid
        conn.close()
        
        # Schedule the alert check
        try:
            from tasks import schedule_alert_check
            schedule_alert_check.delay(alert_id)
            print(f"Alert check scheduled for alert ID {alert_id}: {company_name} - {metric} {condition} {threshold}")
        except Exception as e:
            print(f"Error scheduling alert check: {e}")
            # Non-critical error, we can continue
        
        # Log the alert creation
        print(f"Alert set: {company_name} - {metric} {condition} {threshold}")
        
        return jsonify({"success": True, "alert_id": alert_id})
    except Exception as e:
        print(f"Error setting alert: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

report_generator = ReportGenerator()

@app.route('/api/generate_report', methods=['POST'])
def generate_report():
    try:
        company_name = request.form.get('company_name')
        if not company_name:
            return jsonify({'success': False, 'message': 'Company name is required'}), 400
            
        # Get report parameters
        template = request.form.get('template', 'detailed')  # Default to detailed report
        sections = request.form.getlist('sections')
        format_type = request.form.get('format', 'pdf')  # Default to PDF
        
        # Debug info
        print(f"Generating {format_type} report for company: {company_name}")
        print(f"Template: {template}")
        print(f"Sections: {sections}")
        
        # Get company data
        conn = sqlite3.connect(CREDIT_RISK_DB_PATH)
        cursor = conn.cursor()
        
        # Get company data from credit_risk table
        cursor.execute('''
            SELECT * FROM credit_risk 
            WHERE Company = ?
        ''', (company_name,))
        
        columns = [desc[0] for desc in cursor.description]
        row = cursor.fetchone()
        
        if not row:
            return jsonify({'success': False, 'message': 'Company not found'}), 404
            
        # Create data dictionary
        company_data = dict(zip(columns, row))
        
        # Calculate risk level based on Probability of Default
        pd = company_data.get('Probability of Default', 0)
        if pd < 0.01:
            risk_level = 'Low'
        elif pd < 0.05:
            risk_level = 'Medium'
        else:
            risk_level = 'High'
        
        # Prepare report data
        report_data = {
            'company_name': company_name,
            'sections': []
        }
        
        # Add sections based on template
        if template == 'standard':
            sections = ['company_info', 'risk_profile', 'financial_metrics', 'dscr_analysis']
        elif template == 'executive':
            sections = ['company_info', 'risk_profile', 'recommendations']
        elif template == 'detailed':
            sections = [
                'company_info',
                'risk_profile',
                'financial_metrics',
                'dscr_analysis',
                'recommendations'
            ]
            
        print(f"Final sections to include: {sections}")
        
        # Add sections to report data
        for section in sections:
            if section == 'company_info':
                # Get location data
                location = {
                    'County': company_data.get('County', 'N/A'),
                    'State': company_data.get('State', 'N/A')
                }
                
                report_data['sections'].append({
                    'title': 'Company Information',
                    'section_type': 'company_info',
                    'data': {
                        'Name': company_name,
                        'Industry': company_data.get('Industry', 'N/A'),
                        'Sub-Industry': company_data.get('Sub-Industry', 'N/A'),
                        'Location': f"{location['County']}, {location['State']}" if location['County'] != 'N/A' else 'N/A'
                    }
                })
            elif section == 'risk_profile':
                report_data['sections'].append({
                    'title': 'Risk Profile',
                    'section_type': 'risk_profile',
                    'data': {
                        'Credit Rating': company_data.get('Credit Rating', 'N/A'),
                        'Risk Level': risk_level,
                        'Probability of Default': f"{float(company_data.get('Probability of Default', 0)) * 100:.2f}%",
                        'Loss Given Default': f"{float(company_data.get('Loss Given Default', 0)) * 100:.2f}%",
                        'Expected Loss': f"${float(company_data.get('Expected Loss', 0)):,.2f}"
                    }
                })
            elif section == 'financial_metrics':
                # Convert all financial metrics to the proper format
                current_ratio = float(company_data.get('Current Ratio', 0))
                roa = float(company_data.get('ROA', 0)) * 100
                roe = float(company_data.get('ROE', 0)) * 100
                leverage_ratio = float(company_data.get('Leverage Ratio', 0))
                dscr = float(company_data.get('Debt Service Coverage Ratio', 0))
                total_assets = float(company_data.get('Total Assets', 0))
                total_revenue = float(company_data.get('Total Revenue', 0))
                gross_profit_margin = float(company_data.get('Gross Profit Margin', 0)) * 100
                
                report_data['sections'].append({
                    'title': 'Financial Metrics',
                    'section_type': 'financial_metrics',
                    'data': {
                        'Current Ratio': f"{current_ratio:.2f}",
                        'ROA': f"{roa:.2f}%",
                        'ROE': f"{roe:.2f}%",
                        'Leverage Ratio': f"{leverage_ratio:.2f}",
                        'Debt Service Coverage Ratio': f"{dscr:.2f}",
                        'Total Assets': f"${total_assets:,.2f}",
                        'Total Revenue': f"${total_revenue:,.2f}",
                        'Gross Profit Margin': f"{gross_profit_margin:.2f}%"
                    }
                })
            elif section == 'dscr_analysis':
                # Add DSCR analysis section
                report_data['sections'].append({
                    'title': 'DSCR Analysis',
                    'section_type': 'dscr_analysis',
                    'data': {
                        'Debt Service Coverage Ratio': f"{dscr:.2f}",
                        'Net Operating Income': f"${float(company_data.get('Net Operating Income', 0)):,.2f}",
                        'Total Debt Service': f"${float(company_data.get('Total Debt Service', 0)):,.2f}"
                    }
                })
            elif section == 'recommendations':
                # Generate recommendations based on actual financial data
                dscr_rec = ""
                if dscr < 1.0:
                    dscr_rec = "The DSCR is below 1.0, indicating potential difficulty in servicing debt. Consider debt restructuring options."
                elif dscr < 1.25:
                    dscr_rec = "The DSCR is adequate but could be improved. Monitor cash flow closely."
                else:
                    dscr_rec = "The DSCR is strong, indicating good debt servicing capacity."
                
                leverage_rec = ""
                if leverage_ratio > 3.0:
                    leverage_rec = "The leverage ratio is relatively high. Consider strategies to reduce debt or increase equity."
                elif leverage_ratio > 2.0:
                    leverage_rec = "The leverage ratio is moderate. Monitor this metric to ensure it doesn't increase significantly."
                else:
                    leverage_rec = "The leverage ratio is conservative, providing good financial flexibility."
                
                report_data['sections'].append({
                    'title': 'Recommendations & Action Items',
                    'section_type': 'recommendations',
                    'data': f"""Based on our comprehensive analysis of {company_name}, we recommend the following actions:

1. {'Continue monitoring financial health, no immediate concerns.' if risk_level == 'Low' else 'Increase monitoring frequency and consider requesting additional financial statements.' if risk_level == 'Medium' else 'Schedule detailed review with the client to discuss mitigation strategies for their elevated risk profile.'}

2. {dscr_rec}

3. {leverage_rec}

4. {'Consider opportunities for expanding the relationship with this strong performer.' if risk_level == 'Low' else 'Maintain relationship while assessing opportunities to improve financial indicators.' if risk_level == 'Medium' else 'Evaluate overall exposure and develop contingency plans.'}

This assessment was prepared by Live Oak Bank's Risk Analysis Department on {datetime.now().strftime('%Y-%m-%d')}.
"""
                })
        
        # Create absolute path for report directory
        absolute_report_dir = os.path.abspath(app.config['REPORT_DIR'])
        print(f"Absolute report directory path: {absolute_report_dir}")
        
        # Generate timestamp for unique filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        safe_company_name = ''.join(c if c.isalnum() else '_' for c in company_name)
        filename = f"{safe_company_name}_{timestamp}.{format_type}"
        
        # Ensure report directory exists
        os.makedirs(absolute_report_dir, exist_ok=True)
        print(f"Report directory exists: {os.path.exists(absolute_report_dir)}")
        
        # Generate temporary file path just for logging
        temp_filepath = os.path.join(absolute_report_dir, filename)
        print(f"Will generate report at: {temp_filepath}")
        
        try:
            # Generate report using the appropriate format
            report_generator = ReportGenerator(template_dir=app.config['TEMPLATE_DIR'], output_dir=absolute_report_dir)
            
            if format_type.lower() == 'pdf':
                filepath = report_generator._generate_pdf_report(report_data, {}, absolute_report_dir)
                print(f"PDF report generated at: {filepath}")
            elif format_type.lower() == 'excel':
                filepath = report_generator._generate_excel_report(report_data, {}, absolute_report_dir)
                print(f"Excel report generated at: {filepath}")
            else:  # html or other formats
                filepath = report_generator.generate_report(company_name, report_data)
                print(f"HTML report generated at: {filepath}")
            
            # Safety checks
            if not filepath:
                print("Error: filepath is None or empty")
                return jsonify({'success': False, 'message': 'Failed to generate report (no filepath returned)'}), 500
                
            # Extract just the filename from the full path
            if os.path.exists(filepath):
                print(f"File successfully created at {filepath}")
                filename = os.path.basename(filepath)
                print(f"Report filename: {filename}")
                file_size = os.path.getsize(filepath)
                print(f"File size: {file_size} bytes")
                
                # Return success response with download URL
                download_url = url_for('download_report', filename=filename)
                print(f"Download URL: {download_url}")
                return jsonify({
                    'success': True,
                    'message': 'Report generated successfully',
                    'download_url': download_url,
                    'filepath': filepath,  # For debugging
                    'file_exists': os.path.exists(filepath)  # For debugging
                })
            else:
                print(f"Error: Generated file does not exist at {filepath}")
                return jsonify({
                    'success': False, 
                    'message': f'Failed to generate report file. File not found at {filepath}'
                }), 500
            
        except Exception as e:
            print(f"Error in report generation: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'message': f'Error generating report: {str(e)}'}), 500
    except Exception as e:
        print(f"Error generating report: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Error generating report: {str(e)}'}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/api/download_report/<filename>')
def download_report(filename):
    try:
        # Make sure the report directory exists and use absolute path
        report_dir = os.path.abspath(app.config['REPORT_DIR'])
        if not os.path.exists(report_dir):
            os.makedirs(report_dir, exist_ok=True)
            
        # Full path to the file
        filepath = os.path.join(report_dir, filename)
        print(f"Attempting to download file from: {filepath}")
            
        # Check if the file exists
        if not os.path.exists(filepath):
            print(f"Error: File not found at {filepath}")
            return jsonify({
                'success': False,
                'message': f'Report file not found at {filepath}'
            }), 404
            
        # Get file size and last modified time for debugging
        file_size = os.path.getsize(filepath)
        last_modified = os.path.getmtime(filepath)
        print(f"File exists: Size={file_size} bytes, Last Modified={datetime.fromtimestamp(last_modified)}")
        
        # Determine mime type based on file extension
        mime_type = 'application/octet-stream'  # Default
        if filename.lower().endswith('.pdf'):
            mime_type = 'application/pdf'
        elif filename.lower().endswith('.xlsx'):
            mime_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        elif filename.lower().endswith('.html'):
            mime_type = 'text/html'
            
        print(f"Using MIME type: {mime_type}")
        
        # Enhanced direct file serving with specific cache settings
        response = send_file(
            filepath,
            mimetype=mime_type,
            as_attachment=True,
            download_name=filename,
            etag=True,
            conditional=False,
            last_modified=datetime.fromtimestamp(last_modified)
        )
        
        # Add headers to disable caching for better reliability
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        response.headers["Content-Length"] = str(file_size)
            
        return response
            
    except Exception as e:
        print(f"Error downloading report: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Error downloading report: {str(e)}'
        }), 500

@app.route('/api/company_metrics')
def company_metrics():
    """Get current metrics for a company for use in the alert form"""
    if 'username' not in session:
        return jsonify({"success": False, "message": "Not logged in"}), 401
    
    try:
        company_name = request.args.get('company')
        if not company_name:
            return jsonify({"success": False, "message": "Company name is required"}), 400
            
        # Connect to database
        conn = sqlite3.connect(CREDIT_RISK_DB_PATH)
        c = conn.cursor()
        
        # Get company data
        c.execute("SELECT * FROM credit_risk WHERE Company = ?", (company_name,))
        company_data = c.fetchone()
        
        if not company_data:
            return jsonify({"success": False, "message": "Company not found"}), 404
            
        # Get column names
        column_names = [description[0] for description in c.description]
        
        # Create dictionary with column names and values
        company = dict(zip(column_names, company_data))
        
        # Map database columns to metrics in the alert form
        metrics = {
            'credit_rating': company.get('Credit Rating', 'N/A'),
            'pd': round(company.get('Probability of Default', 0) * 100, 2),  # Convert to percentage
            'expected_loss': round(company.get('Expected Loss', 0), 2),
            'current_ratio': round(company.get('Current Ratio', 0), 2),
            'roe': round(company.get('ROE', 0) * 100, 2),  # Convert to percentage
            'leverage_ratio': round(company.get('Leverage Ratio', 0), 2)
        }
        
        conn.close()
        
        return jsonify({
            "success": True,
            "company": company_name,
            "metrics": metrics
        })
        
    except Exception as e:
        print(f"Error getting company metrics: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/geoheatmap')
def geoheatmap():
    # Check if logged in
    if 'username' not in session:
        return redirect(url_for('login'))
    
    username = session['username']
    
    # Get all industries for the filters
    custom_industries = get_user_industries(username)
    all_industries = DEFAULT_INDUSTRIES + custom_industries
    
    # Get selected industry filter
    industry_filter = request.args.get('industry', 'all')
    metric = request.args.get('metric', 'revenue')
    
    # Check if this is an AJAX request
    is_ajax = request.args.get('ajax', 'false') == 'true'
    
    # Connect to database to get county data
    conn = sqlite3.connect(CREDIT_RISK_DB_PATH)
    c = conn.cursor()
    
    # First, check if the columns exist and add them if they don't
    try:
        # Check if the county, state, revenue and is_client columns exist
        c.execute("PRAGMA table_info(credit_risk)")
        columns = [column[1] for column in c.fetchall()]
        
        # Add missing columns if needed
        if 'County' not in columns:
            c.execute("ALTER TABLE credit_risk ADD COLUMN County TEXT")
        
        if 'State' not in columns:
            c.execute("ALTER TABLE credit_risk ADD COLUMN State TEXT")
        
        if 'Revenue' not in columns:
            c.execute("ALTER TABLE credit_risk ADD COLUMN Revenue REAL")
        
        if 'is_client' not in columns:
            c.execute("ALTER TABLE credit_risk ADD COLUMN is_client INTEGER DEFAULT 0")
        
        conn.commit()
        
        # Add sample geographic data to existing companies for demo purposes
        # This would be replaced with real data in a production environment
        import random
        
        # Sample counties and states
        counties = [
            ("Los Angeles", "California"), ("Cook", "Illinois"), 
            ("Harris", "Texas"), ("Maricopa", "Arizona"),
            ("San Diego", "California"), ("Orange", "California"),
            ("Miami-Dade", "Florida"), ("Kings", "New York"),
            ("Dallas", "Texas"), ("Queens", "New York"),
            ("Riverside", "California"), ("King", "Washington"),
            ("Clark", "Nevada"), ("San Bernardino", "California"),
            ("Tarrant", "Texas"), ("Bexar", "Texas"),
            ("Broward", "Florida"), ("Santa Clara", "California"),
            ("Wayne", "Michigan"), ("Alameda", "California")
        ]
        
        # Check if geographic data needs to be populated
        c.execute("SELECT COUNT(*) FROM credit_risk WHERE County IS NOT NULL")
        count = c.fetchone()[0]
        
        if count == 0:
            # Get all companies
            c.execute("SELECT id, Company FROM credit_risk")
            companies = c.fetchall()
            
            # Update companies with random county data
            for company_id, company_name in companies:
                # Randomly assign a county and state
                county, state = random.choice(counties)
                
                # Generate random revenue (1M to 100M)
                revenue = random.uniform(1000000, 100000000)
                
                # Randomly decide if it's a client (70% are clients)
                is_client = 1 if random.random() < 0.7 else 0
                
                # Update the record
                c.execute("""
                    UPDATE credit_risk 
                    SET County = ?, State = ?, Revenue = ?, is_client = ?
                    WHERE id = ?
                """, (county, state, revenue, is_client, company_id))
            
            conn.commit()
    except Exception as e:
        print(f"Error preparing county data: {e}")
    
    # Now query the data
    try:
        c.execute("""
            SELECT Company, Industry, "Sub-Industry", "Credit Rating", 
            "Probability of Default", "Debt Service Coverage Ratio", 
            "Current Ratio", "ROE", County, State, 
            Revenue, is_client
            FROM credit_risk
            WHERE County IS NOT NULL
        """)
        
        # Get the data
        columns = [description[0] for description in c.description]
        county_data = []
        
        for row in c.fetchall():
            company_data = {}
            for i, column in enumerate(columns):
                company_data[column] = row[i]
            
            # Add risk rating
            pd = company_data.get('Probability of Default', 0)
            if pd < 0.01:
                company_data['risk_level'] = 'low'
            elif pd < 0.05:
                company_data['risk_level'] = 'medium'
            else:
                company_data['risk_level'] = 'high'
            
            county_data.append(company_data)
    except Exception as e:
        print(f"Error fetching county data: {e}")
        county_data = []
    
    conn.close()
    
    # Process the data to aggregate by county
    county_metrics = {}
    
    for company in county_data:
        county_name = company.get('County')
        state_name = company.get('State')
        
        if not county_name or not state_name:
            continue
        
        county_key = f"{county_name}, {state_name}"
        
        if county_key not in county_metrics:
            county_metrics[county_key] = {
                'county': county_name,
                'state': state_name,
                'companies': [],
                'revenue_total': 0,
                'pd_avg': 0,
                'fcr_avg': 0,
                'cr_avg': 0,
                'risk_counts': {'high': 0, 'medium': 0, 'low': 0},
                'client_counts': {'current': 0, 'potential': 0}
            }
        
        # Add company data
        county_metrics[county_key]['companies'].append({
            'name': company.get('Company'),
            'industry': company.get('Industry'),
            'risk_level': company.get('risk_level'),
            'is_client': bool(company.get('is_client', 0))
        })
        
        # Update metrics
        county_metrics[county_key]['revenue_total'] += company.get('Revenue', 0)
        
        # Update risk counts
        risk_level = company.get('risk_level')
        if risk_level:
            county_metrics[county_key]['risk_counts'][risk_level] += 1
        
        # Update client counts
        is_client = bool(company.get('is_client', 0))
        client_type = 'current' if is_client else 'potential'
        county_metrics[county_key]['client_counts'][client_type] += 1
    
    # Calculate averages
    for county_key, metrics in county_metrics.items():
        total_companies = len(metrics['companies'])
        if total_companies > 0:
            # Calculate total PD, FCR, CR
            pd_total = sum(company.get('Probability of Default', 0) for company in county_data 
                           if company.get('County') == metrics['county'] and company.get('State') == metrics['state'])
            fcr_total = sum(company.get('Debt Service Coverage Ratio', 0) for company in county_data 
                            if company.get('County') == metrics['county'] and company.get('State') == metrics['state'])
            cr_total = sum(company.get('Current Ratio', 0) for company in county_data 
                           if company.get('County') == metrics['county'] and company.get('State') == metrics['state'])
            
            # Calculate averages
            metrics['pd_avg'] = pd_total / total_companies
            metrics['fcr_avg'] = fcr_total / total_companies
            metrics['cr_avg'] = cr_total / total_companies
        
        # Determine dominant risk level
        risk_counts = metrics['risk_counts']
        max_risk = max(risk_counts, key=risk_counts.get)
        metrics['dominant_risk'] = max_risk
    
    # Render the template with the appropriate layout
    if is_ajax:
        # For AJAX requests, only render the content part
        return render_template('geoheatmap_content.html',
                             username=username,
                             industries=all_industries,
                             default_industries=DEFAULT_INDUSTRIES,
                             county_data=county_metrics,
                             industry_filter=industry_filter,
                             metric=metric,
                             now=datetime.now())
    else:
        # For regular requests, render the full page
        return render_template('geoheatmap.html',
                             username=username,
                             industries=all_industries,
                             default_industries=DEFAULT_INDUSTRIES,
                             county_data=county_metrics,
                             industry_filter=industry_filter,
                             metric=metric,
                             now=datetime.now())

@app.route('/api/county_data')
def county_data():
    """Get the county-level data for the map based on filters"""
    if 'username' not in session:
        return jsonify({"success": False, "message": "Not logged in"}), 401
    
    try:
        industry = request.args.get('industry', 'all')
        metric = request.args.get('metric', 'revenue')
        client_types = request.args.getlist('client_type')
        
        # Connect to database
        conn = sqlite3.connect(CREDIT_RISK_DB_PATH)
        c = conn.cursor()
        
        # Make sure columns exist
        c.execute("PRAGMA table_info(credit_risk)")
        columns = [column[1] for column in c.fetchall()]
        
        # Check if columns exist before querying
        required_columns = ['County', 'State', 'Revenue', 'is_client']
        missing_columns = [col for col in required_columns if col not in columns]
        
        if missing_columns:
            # Some required columns are missing, we should redirect to the geoheatmap route 
            # which will add the columns
            conn.close()
            return jsonify({
                "success": False, 
                "message": "Geographic data is not set up yet. Please visit the Geographic Heatmap page first."
            }), 400
        
        query = """
            SELECT Company, Industry, "Sub-Industry", "Credit Rating", 
            "Probability of Default", "Debt Service Coverage Ratio", 
            "Current Ratio", "ROE", County, State, 
            Revenue, is_client
            FROM credit_risk
            WHERE County IS NOT NULL
        """
        
        # Add industry filter if not 'all'
        params = []
        if industry != 'all':
            query += " AND Industry = ?"
            params.append(industry)
        
        # Add client type filter if specified
        if client_types and len(client_types) == 1:
            if 'current' in client_types:
                query += " AND is_client = 1"
            elif 'potential' in client_types:
                query += " AND is_client = 0"
        
        # Execute query
        if params:
            c.execute(query, params)
        else:
            c.execute(query)
        
        # Get the data
        columns = [description[0] for description in c.description]
        county_data = []
        
        for row in c.fetchall():
            company_data = {}
            for i, column in enumerate(columns):
                company_data[column] = row[i]
            
            # Add risk rating
            pd = company_data.get('Probability of Default', 0)
            if pd < 0.01:
                company_data['risk_level'] = 'low'
            elif pd < 0.05:
                company_data['risk_level'] = 'medium'
            else:
                company_data['risk_level'] = 'high'
            
            county_data.append(company_data)
        
        conn.close()
        
        # Process the data to aggregate by county
        county_metrics = {}
        
        for company in county_data:
            county_name = company.get('County')
            state_name = company.get('State')
            
            if not county_name or not state_name:
                continue
            
            county_key = f"{county_name}, {state_name}"
            
            if county_key not in county_metrics:
                county_metrics[county_key] = {
                    'county': county_name,
                    'state': state_name,
                    'companies': [],
                    'revenue_total': 0,
                    'pd_avg': 0,
                    'fcr_avg': 0,
                    'cr_avg': 0,
                    'risk_counts': {'high': 0, 'medium': 0, 'low': 0},
                    'client_counts': {'current': 0, 'potential': 0}
                }
            
            # Add company data
            county_metrics[county_key]['companies'].append({
                'name': company.get('Company'),
                'industry': company.get('Industry'),
                'risk_level': company.get('risk_level'),
                'is_client': bool(company.get('is_client', 0))
            })
            
            # Update metrics
            county_metrics[county_key]['revenue_total'] += company.get('Revenue', 0)
            
            # Update risk counts
            risk_level = company.get('risk_level')
            if risk_level:
                county_metrics[county_key]['risk_counts'][risk_level] += 1
            
            # Update client counts
            is_client = bool(company.get('is_client', 0))
            client_type = 'current' if is_client else 'potential'
            county_metrics[county_key]['client_counts'][client_type] += 1
        
        # Calculate averages
        for county_key, metrics in county_metrics.items():
            total_companies = len(metrics['companies'])
            if total_companies > 0:
                # Calculate total PD, FCR, CR
                pd_total = sum(company.get('Probability of Default', 0) for company in county_data 
                               if company.get('County') == metrics['county'] and company.get('State') == metrics['state'])
                fcr_total = sum(company.get('Debt Service Coverage Ratio', 0) for company in county_data 
                                if company.get('County') == metrics['county'] and company.get('State') == metrics['state'])
                cr_total = sum(company.get('Current Ratio', 0) for company in county_data 
                               if company.get('County') == metrics['county'] and company.get('State') == metrics['state'])
                
                # Calculate averages
                metrics['pd_avg'] = pd_total / total_companies
                metrics['fcr_avg'] = fcr_total / total_companies
                metrics['cr_avg'] = cr_total / total_companies
            
            # Determine dominant risk level
            risk_counts = metrics['risk_counts']
            max_risk = max(risk_counts, key=risk_counts.get)
            metrics['dominant_risk'] = max_risk
        
        # Check if we have data for all states and add simulated data if needed
        # List of all US states
        all_states = [
            'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
            'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
            'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
            'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
            'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
            'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
            'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
            'Wisconsin', 'Wyoming', 'District of Columbia'
        ]
        
        # Check which states we have data for
        states_with_data = set()
        for county_key in county_metrics:
            state = county_key.split(', ')[1]
            states_with_data.add(state)
        
        # Add simulated data for states with no data
        for state in all_states:
            if state not in states_with_data:
                # Add simulated data for 3-5 counties in this state
                num_counties = random.randint(3, 5)
                common_counties = [
                    'Washington', 'Jefferson', 'Franklin', 'Lincoln', 'Jackson', 'Madison', 'Adams',
                    'Montgomery', 'Clay', 'Marion', 'Wayne', 'Henry', 'Morgan', 'Union', 'Greene'
                ]
                
                # Define regional risk profiles
                high_risk_regions = ['Nevada', 'Louisiana', 'Mississippi', 'Arizona', 'New Mexico', 'Alabama', 'Florida']
                low_risk_regions = ['Minnesota', 'Vermont', 'New Hampshire', 'Massachusetts', 'Connecticut', 'Utah', 'Washington']
                medium_risk_regions = ['California', 'New York', 'Texas', 'Ohio', 'Pennsylvania', 'Illinois', 'Michigan']
                
                for i in range(num_counties):
                    if i < len(common_counties):
                        county_name = common_counties[i]
                    else:
                        county_name = f"County {i+1}"
                    
                    county_key = f"{county_name}, {state}"
                    
                    # Create simulated data for this county
                    num_companies = random.randint(8, 15)  # Ensure enough companies for meaningful data
                    companies = []
                    revenue_total = 0
                    pd_total = 0
                    fcr_total = 0
                    cr_total = 0
                    
                    # Determine risk profile based on state
                    if state in high_risk_regions:
                        # High risk profile: more high-risk companies
                        high_risk_count = int(num_companies * (0.45 + random.random() * 0.15))  # 45-60%
                        medium_risk_count = int(num_companies * (0.20 + random.random() * 0.20))  # 20-40%
                        low_risk_count = num_companies - high_risk_count - medium_risk_count
                    elif state in low_risk_regions:
                        # Low risk profile: more low-risk companies
                        low_risk_count = int(num_companies * (0.45 + random.random() * 0.15))  # 45-60%
                        medium_risk_count = int(num_companies * (0.20 + random.random() * 0.20))  # 20-40%
                        high_risk_count = num_companies - low_risk_count - medium_risk_count
                    elif state in medium_risk_regions:
                        # Medium risk profile: more medium-risk companies
                        medium_risk_count = int(num_companies * (0.45 + random.random() * 0.15))  # 45-60%
                        high_risk_count = int(num_companies * (0.20 + random.random() * 0.15))  # 20-35%
                        low_risk_count = num_companies - medium_risk_count - high_risk_count
                    else:
                        # Balanced risk profile with slight randomization
                        medium_risk_count = int(num_companies * (0.33 + (random.random() * 0.1) - 0.05))  # 28-43%
                        high_risk_count = int(num_companies * (0.33 + (random.random() * 0.1) - 0.05))  # 28-43%
                        low_risk_count = num_companies - medium_risk_count - high_risk_count
                    
                    # Adjust to ensure valid counts
                    if high_risk_count < 0: high_risk_count = 0
                    if medium_risk_count < 0: medium_risk_count = 0
                    if low_risk_count < 0: low_risk_count = 0
                    if high_risk_count + medium_risk_count + low_risk_count != num_companies:
                        # Adjust the largest count to make the total correct
                        max_count = max(high_risk_count, medium_risk_count, low_risk_count)
                        if max_count == high_risk_count:
                            high_risk_count = num_companies - medium_risk_count - low_risk_count
                        elif max_count == medium_risk_count:
                            medium_risk_count = num_companies - high_risk_count - low_risk_count
                        else:
                            low_risk_count = num_companies - high_risk_count - medium_risk_count
                    
                    risk_counts = {'high': high_risk_count, 'medium': medium_risk_count, 'low': low_risk_count}
                    client_counts = {'current': 0, 'potential': 0}
                    
                    # Determine the dominant risk level
                    if high_risk_count >= medium_risk_count and high_risk_count >= low_risk_count:
                        dominant_risk = 'high'
                        # High risk profile metrics
                        avg_revenue = random.uniform(5000000, 35000000)  # Lower revenue
                        avg_pd = random.uniform(0.05, 0.1)  # Higher probability of default
                        avg_fcr = random.uniform(0.5, 1.5)  # Lower debt service coverage ratio
                        avg_cr = random.uniform(0.5, 1.5)  # Lower current ratio
                    elif medium_risk_count >= high_risk_count and medium_risk_count >= low_risk_count:
                        dominant_risk = 'medium'
                        # Medium risk profile metrics
                        avg_revenue = random.uniform(10000000, 60000000)  # Medium revenue
                        avg_pd = random.uniform(0.01, 0.05)  # Medium probability of default
                        avg_fcr = random.uniform(1.0, 2.0)  # Medium debt service coverage ratio
                        avg_cr = random.uniform(1.0, 2.0)  # Medium current ratio
                    else:
                        dominant_risk = 'low'
                        # Low risk profile metrics
                        avg_revenue = random.uniform(20000000, 90000000)  # Higher revenue
                        avg_pd = random.uniform(0.001, 0.01)  # Lower probability of default
                        avg_fcr = random.uniform(1.5, 3.0)  # Higher debt service coverage ratio
                        avg_cr = random.uniform(1.5, 3.0)  # Higher current ratio
                    
                    # Create company objects
                    companies = []  # Initialize the companies list
                    companies_created = 0
                    for risk_level in ['high', 'medium', 'low']:
                        risk_count = risk_counts[risk_level]
                        for j in range(risk_count):
                            # Determine client type
                            is_client = random.choice([True, False])
                            client_type = 'current' if is_client else 'potential'
                            client_counts[client_type] += 1
                            
                            # Add company if client type matches filter
                            if not client_types or client_type in client_types:
                                industry_choice = industry if industry != 'all' else random.choice(
                                    ['Healthcare', 'Solar Energy', 'Technology', 'Banking', 'Retail', 
                                     'Manufacturing', 'Agriculture', 'Other']
                                )
                                
                                companies.append({
                                    'name': f"Company {companies_created+1} in {county_name}",
                                    'industry': industry_choice,
                                    'risk_level': risk_level,
                                    'is_client': is_client
                                })
                                companies_created += 1
                    
                    # Create county metrics object
                    county_metrics[county_key] = {
                        'county': county_name,
                        'state': state,
                        'companies': companies,
                        'revenue_total': avg_revenue * num_companies,
                        'pd_avg': avg_pd,
                        'fcr_avg': avg_fcr,
                        'cr_avg': avg_cr,
                        'risk_counts': risk_counts,
                        'client_counts': client_counts,
                        'dominant_risk': dominant_risk
                    }
        
        return jsonify({
            "success": True,
            "counties": county_metrics
        })
        
    except Exception as e:
        print(f"Error getting county data: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/ping')
def ping():
    """简单的API端点，用于检查服务器连接状态"""
    return jsonify({"status": "ok", "message": "Server is running"}), 200

@app.route('/generate_test_report')
def generate_test_report():
    """Direct endpoint to generate a test report for debugging"""
    try:
        # Create a simple test report
        company_name = "Test Company"
        report_data = {
            'company_name': company_name,
            'sections': [
                {
                    'title': 'Company Information',
                    'section_type': 'company_info',
                    'data': {
                        'Name': company_name,
                        'Industry': 'Testing',
                        'Sub-Industry': 'Software Testing',
                        'Location': 'Test County, Test State'
                    }
                },
                {
                    'title': 'Risk Profile',
                    'section_type': 'risk_profile',
                    'data': {
                        'Credit Rating': 'A',
                        'Risk Level': 'Low',
                        'Probability of Default': '0.50%',
                        'Loss Given Default': '20.00%',
                        'Expected Loss': '$1,000.00'
                    }
                },
                {
                    'title': 'Recommendations',
                    'section_type': 'recommendations',
                    'data': 'This is a test recommendation for the company.'
                }
            ]
        }
        
        # Create absolute path for report directory
        absolute_report_dir = os.path.abspath(app.config['REPORT_DIR'])
        print(f"Report directory: {absolute_report_dir}")
        
        # Make sure it exists
        os.makedirs(absolute_report_dir, exist_ok=True)
        
        # Generate report
        report_generator = ReportGenerator(template_dir=app.config['TEMPLATE_DIR'], output_dir=absolute_report_dir)
        filepath = report_generator._generate_pdf_report(report_data, {}, absolute_report_dir)
        
        # Check if file was created
        if os.path.exists(filepath):
            print(f"Test report created at: {filepath}")
            filename = os.path.basename(filepath)
            
            # Try to send the file directly
            return send_file(
                filepath,
                as_attachment=True,
                download_name=filename,
                mimetype='application/pdf'
            )
        else:
            return jsonify({
                'success': False,
                'message': f'Failed to generate test report at {filepath}'
            }), 500
            
    except Exception as e:
        print(f"Error generating test report: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Error generating test report: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(debug=True)
