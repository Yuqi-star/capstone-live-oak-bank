import requests
from typing import List, Optional
import logging
import json
from datetime import datetime, timedelta
import os
from config import ALPHA_VANTAGE_API_KEY, DEFAULT_INDUSTRIES

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cache settings
CACHE_FILE = "news_cache.json"
CACHE_DURATION = timedelta(minutes=15)  # Cache for 15 minutes

def load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r') as f:
                cache = json.load(f)
                # Check if cache is expired
                if datetime.now().timestamp() - cache['timestamp'] < CACHE_DURATION.total_seconds():
                    return cache['data']
        except Exception as e:
            logger.error(f"Error loading cache: {e}")
    return None

def save_cache(data):
    try:
        cache = {
            'timestamp': datetime.now().timestamp(),
            'data': data
        }
        with open(CACHE_FILE, 'w') as f:
            json.dump(cache, f)
    except Exception as e:
        logger.error(f"Error saving cache: {e}")

def format_timestamp(timestamp_str):
    """将API返回的时间戳格式化为易读格式"""
    if not timestamp_str:
        return "N/A"
    
    try:
        # 解析格式如 20250227T164413
        year = int(timestamp_str[0:4])
        month = int(timestamp_str[4:6])
        day = int(timestamp_str[6:8])
        hour = int(timestamp_str[9:11])
        minute = int(timestamp_str[11:13])
        
        # 创建datetime对象
        dt = datetime(year, month, day, hour, minute)
        
        # 返回格式化后的字符串，例如 "Feb 27, 2025 4:44 PM"
        return dt.strftime("%b %d, %Y %I:%M %p")
    except Exception as e:
        logger.error(f"Error formatting timestamp {timestamp_str}: {e}")
        return timestamp_str

def get_news(industries: Optional[List[str]] = None, search_query: Optional[str] = None):
    try:
        # First try to load data from cache
        cached_data = load_cache()
        if cached_data is not None:
            logger.info("Using cached news data")
            all_news = cached_data
        else:
            logger.info("Fetching fresh news data from API")
            API_KEY = "H2SU1HEM2F21X9W4"
            # 添加时间范围参数，获取最近7天的新闻
            time_from = (datetime.now() - timedelta(days=7)).strftime('%Y%m%dT%H%M')
            base_url = (f"https://www.alphavantage.co/query?"
                       f"function=NEWS_SENTIMENT&"
                       f"apikey={API_KEY}&"
                       f"limit=500&"  # 增加到500条
                       f"time_from={time_from}")
            
            # 不在API请求中添加行业过滤，而是在后处理中进行过滤
            # 这样可以获取所有新闻，然后根据选中的行业进行精确过滤
            if search_query:
                base_url += f"&keywords={search_query}"
            
            logger.info(f"Making API request to: {base_url}")
            response = requests.get(base_url)
            data = response.json()
            
            # Check API limits
            if "Note" in data:
                logger.warning(f"API Limit Message: {data['Note']}")
                # If limited, try using cached data
                if os.path.exists(CACHE_FILE):
                    logger.info("Using older cached data due to API limit")
                    with open(CACHE_FILE, 'r') as f:
                        cached = json.load(f)
                        return cached['data']
                return [{
                    "title": "API Limit Reached",
                    "summary": f"API Limit Message: {data['Note']}. Please try again later.",
                    "url": "#",
                    "sentiment": 0,
                    "sentiment_abs": 0,
                    "industries": [],
                    "time_published": ""
                }]
            
            if "feed" not in data:
                logger.warning("No 'feed' in response data")
                return []
            
            all_news = data['feed']
            logger.info(f"Successfully retrieved {len(all_news)} news articles")
            # Save to cache
            save_cache(all_news)

        # Process news data
        news_list = []
        
        # 将所有行业转换为小写，用于不区分大小写的匹配
        industries_lower = [industry.lower() for industry in industries] if industries else []
        search_query_lower = search_query.lower() if search_query else None
        
        for article in all_news:
            try:
                # 获取文章的行业/主题
                article_industries = [topic.get('topic', '').strip() if isinstance(topic, dict) else topic.strip() 
                                   for topic in article.get("topics", [])]
                article_title = article.get("title", "").lower()
                article_summary = article.get("summary", "").lower()
                
                # 默认不匹配
                matched = False
                
                # 如果有搜索查询，优先按搜索查询过滤
                if search_query_lower:
                    if (search_query_lower in article_title or 
                        search_query_lower in article_summary or
                        any(search_query_lower in topic.lower() for topic in article_industries)):
                        matched = True
                # 否则，如果有选择行业，严格按照选中的行业过滤
                elif industries and industries_lower:
                    for industry in industries_lower:
                        # 检查标题、摘要和主题中是否包含行业关键词
                        if (industry in article_title or
                            industry in article_summary or
                            any(industry in topic.lower() for topic in article_industries)):
                            matched = True
                            break
                else:
                    # 如果没有选择任何行业也没有搜索查询，显示一个特殊消息
                    matched = False
                
                if matched:
                    sentiment_score = article.get("overall_sentiment_score", 0)
                    news_item = {
                        "title": article.get("title", "No title"),
                        "summary": article.get("summary", "No summary"),
                        "url": article.get("url", "#"),
                        "sentiment": sentiment_score,
                        "sentiment_abs": abs(sentiment_score),
                        "industries": article_industries,  # 使用处理过的主题列表
                        "time_published": article.get("time_published", ""),
                        "raw_time_published": article.get("time_published", ""),
                        "formatted_time": format_timestamp(article.get("time_published", ""))
                    }
                    news_list.append(news_item)
                    
            except Exception as e:
                logger.error(f"Error processing article: {e}")
                continue
        
        # Sort by sentiment score absolute value (descending), then by time (descending)
        news_list.sort(key=lambda x: (-x["sentiment_abs"], x["time_published"]), reverse=True)
        
        if not news_list:
            if search_query:
                return [{
                    "title": "No news available",
                    "summary": f"No news found for '{search_query}'. Try a different search term or add it as a new industry.",
                    "url": "",
                    "sentiment": 0,
                    "sentiment_abs": 0,
                    "industries": [],
                    "time_published": ""
                }]
            else:
                return [{
                    "title": "No news available",
                    "summary": "Please select at least one industry to view news." if not industries or len(industries) == 0 else "No news found for the selected industries.",
                    "url": "",
                    "sentiment": 0,
                    "sentiment_abs": 0,
                    "industries": [],
                    "time_published": ""
                }]
            
        return news_list
        
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        logger.exception(e)
        return []

def explore_api():
    API_KEY = "H2SU1HEM2F21X9W4"
    base_url = f"https://www.alphavantage.co/query?function=NEWS_SENTIMENT&apikey={API_KEY}"
    
    response = requests.get(base_url)
    data = response.json()
    
    # Pretty print JSON
    print(json.dumps(data, indent=2))
    
    # Print available fields
    if "feed" in data:
        sample_article = data["feed"][0]
        print("\nAvailable news fields:")
        for key, value in sample_article.items():
            print(f"{key}: {type(value).__name__}")
            if isinstance(value, (list, dict)):
                print(f"Sample value: {value}")

if __name__ == "__main__":
    explore_api()
