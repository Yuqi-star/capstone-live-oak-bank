# config.py
import os

# 获取当前文件的目录
current_dir = os.path.dirname(os.path.abspath(__file__))
# 获取项目根目录
project_root = os.path.dirname(current_dir)

# API Keys
ALPHA_VANTAGE_API_KEY = "H2SU1HEM2F21X9W4"

# Database Config
DB_PATH = os.path.join(project_root, "credit_risk_data.db")
print(f"数据库路径: {DB_PATH}")

# News Config
MAX_NEWS_PER_PAGE = 10

# Default industry list
DEFAULT_INDUSTRIES = [
    "Healthcare",
    "Technology",
    "Energy",
    "Financials",
    "AI"
]

# User-defined industries will be stored in the database
