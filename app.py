from flask import Flask, render_template, request, redirect, url_for, jsonify, session
import sqlite3
import os
from news_fetcher import get_news
from config import DB_PATH, DEFAULT_INDUSTRIES
import secrets
from datetime import timedelta, datetime

app = Flask(__name__)
# 添加 secret key 用于加密 session
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
    # 如果用户已登录，直接跳转到 dashboard
    if 'username' in session:
        return redirect(url_for('dashboard', username=session['username']))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    # 如果用户已登录，直接跳转到 dashboard
    if 'username' in session:
        return redirect(url_for('dashboard', username=session['username']))
        
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        remember = request.form.get('remember') == 'on'
        
        if validate_user(username, password):
            # 如果选择了"记住我"，设置 session 的过期时间为30天
            if remember:
                session.permanent = True
                app.permanent_session_lifetime = timedelta(days=30)
            
            # 保存用户名到 session
            session['username'] = username
            return redirect(url_for('dashboard', username=username))
        return render_template('login.html', error="Invalid credentials")
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        confirm_password = request.form['confirm_password']
        first_name = request.form['first_name']
        last_name = request.form['last_name']

        if password != confirm_password:
            return render_template('register.html', error="Passwords do not match")

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
    # 检查是否登录
    if 'username' not in session:
        return redirect(url_for('login'))
    
    username = session['username']
    # Get all industries (default + custom)
    custom_industries = get_user_industries(username)
    all_industries = DEFAULT_INDUSTRIES + custom_industries
    
    # Get selected industries from URL parameters
    selected_industries = request.args.getlist('industries')
    
    # 获取搜索查询
    search_query = request.args.get('search', '')
    
    # 只有在首次进入（没有任何参数）时才默认全选所有行业
    # 如果有搜索查询，不自动选择行业
    # 如果 URL 中有参数但没有行业参数，说明用户手动取消了所有行业，应该尊重用户的选择
    if not selected_industries and not request.args:
        selected_industries = all_industries
        # 重定向到带有所有行业参数的URL，确保新闻过滤正确
        params = request.args.copy()
        for industry in all_industries:
            params.add('industries', industry)
        return redirect(url_for('dashboard', **params))
    
    # 如果有搜索查询但没有选择行业，则搜索所有新闻
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
                             now=datetime.now())

@app.route('/companies')
def companies():
    # 检查是否登录
    if 'username' not in session:
        return redirect(url_for('login'))
    
    username = session['username']
    
    # 从数据库读取信用风险数据
    print(f"使用数据库路径: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    try:
        # 检查credit_risk表是否存在
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='credit_risk'")
        table_exists = c.fetchone()
        print(f"credit_risk表是否存在: {table_exists is not None}")
        
        if table_exists:
            # 读取信用风险数据
            c.execute("SELECT COUNT(*) FROM credit_risk")
            count = c.fetchone()[0]
            print(f"credit_risk表中的数据数量: {count}")
            
            c.execute("SELECT * FROM credit_risk LIMIT 5")
            sample_data = c.fetchall()
            print(f"示例数据: {sample_data}")
            
            c.execute("SELECT * FROM credit_risk")
            columns = [column[0] for column in c.description]
            companies_data = []
            
            for row in c.fetchall():
                company_data = {}
                for i, column in enumerate(columns):
                    company_data[column] = row[i]
                
                # 添加风险评级
                pd = company_data.get('Probability of Default', 0)
                if pd < 0.01:
                    company_data['risk_level'] = 'low'
                elif pd < 0.05:
                    company_data['risk_level'] = 'medium'
                else:
                    company_data['risk_level'] = 'high'
                    
                companies_data.append(company_data)
            
            print(f"处理后的公司数据数量: {len(companies_data)}")
        else:
            companies_data = []
    except Exception as e:
        print(f"Error fetching company data: {e}")
        companies_data = []
    finally:
        conn.close()
    
    # 获取搜索查询和筛选条件
    search_query = request.args.get('search', '')
    risk_filter = request.args.get('risk', '')
    
    # 应用筛选
    if search_query:
        companies_data = [c for c in companies_data if search_query.lower() in c.get('Company', '').lower()]
    
    if risk_filter:
        companies_data = [c for c in companies_data if c.get('risk_level') == risk_filter]
    
    # 按违约概率排序（从高到低）
    companies_data = sorted(companies_data, key=lambda x: x.get('Probability of Default', 0), reverse=True)
    
    print(f"最终返回的公司数据数量: {len(companies_data)}")
    
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
    # 清除 session
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

if __name__ == '__main__':
    app.run(debug=True, port=8081)
