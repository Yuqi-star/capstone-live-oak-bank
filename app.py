from flask import Flask, render_template, request, redirect, url_for, jsonify, session
import sqlite3
import os
from news_fetcher import get_news
from config import DB_PATH, DEFAULT_INDUSTRIES, HEALTHCARE_SUB_INDUSTRIES, SOLAR_ENERGY_SUB_INDUSTRIES, TECHNOLOGY_SUB_INDUSTRIES, AI_SUB_INDUSTRIES
import secrets
from datetime import timedelta, datetime
import csv
import pandas as pd

app = Flask(__name__)
# Add secret key for session encryption
app.secret_key = secrets.token_hex(16)

# Add these lines near the top of your app.py
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
app.config['TEMPLATES_AUTO_RELOAD'] = True

# Initialize database if it doesn't exist
def init_db():
    # Remove the database deletion code
    # if os.path.exists(DB_PATH):
    #     os.remove(DB_PATH)  # Remove existing database
    
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
    print(f"Using database path: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
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
    
    # Read company data from CSV file
    csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'company_info.csv')
    
    try:
        # Use pandas to read CSV file
        df = pd.read_csv(csv_path)
        # Filter out the first row (header row)
        companies_data = df[df['Category'] != 'Category'].to_dict('records')
        
        # Add industry category labels for each company
        for company in companies_data:
            industry = company.get('Industry', '')
            company_name = company.get('Company Name', '')
            
            # Special handling for JRI company, categorize as Solar Energy's Electrical/Electronic Manufacturing sub-industry
            if 'JR Industries' in company_name or 'JRI' in company_name:
                company['industry_category'] = 'Solar Energy'
                company['industry_color'] = 'solar'
                company['sub_industry'] = 'Electrical/Electronic Manufacturing'
            elif '621610' in industry:
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
                company['sub_industry'] = 'Other'
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

if __name__ == '__main__':
    app.run(debug=True)
