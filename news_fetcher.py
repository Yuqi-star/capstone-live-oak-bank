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
            
            # If there's a search query, add it as keywords
            if search_query:
                base_url += f"&keywords={search_query}"
            # If there are selected industries, add them to search parameters
            elif industries and len(industries) > 0:
                industry_keywords = " OR ".join(industries)
                base_url += f"&keywords={industry_keywords}"
            
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
        
        for article in all_news:
            try:
                article_industries = [topic.get('topic', '').strip() if isinstance(topic, dict) else topic.strip() 
                                   for topic in article.get("topics", [])]
                article_title = article.get("title", "").lower()
                article_summary = article.get("summary", "").lower()
                
                # 修改匹配逻辑
                matched = False
                
                # 如果有选择行业，根据行业过滤
                if industries:
                    for industry in industries:
                        industry_lower = industry.lower()
                        # 检查标题、摘要和主题中是否包含行业关键词
                        if (industry_lower in article_title or
                            industry_lower in article_summary or
                            any(industry_lower in topic.lower() for topic in article_industries)):
                            matched = True
                            break
                else:
                    # 如果没有选择任何行业，显示所有新闻
                    matched = True
                
                # 如果有搜索词，进一步过滤
                if matched and search_query:
                    search_terms = search_query.lower().split()
                    matched = any(term in article_title or term in article_summary 
                                for term in search_terms)
                
                if matched:
                    sentiment_score = article.get("overall_sentiment_score", 0)
                    news_item = {
                        "title": article.get("title", "No title"),
                        "summary": article.get("summary", "No summary"),
                        "url": article.get("url", "#"),
                        "sentiment": sentiment_score,
                        "sentiment_abs": abs(sentiment_score),
                        "industries": article_industries,  # 使用处理过的主题列表
                        "time_published": article.get("time_published", "")
                    }
                    news_list.append(news_item)
                    
            except Exception as e:
                logger.error(f"Error processing article: {e}")
                continue
        
        # Sort by sentiment score absolute value (descending), then by time (descending)
        news_list.sort(key=lambda x: (-x["sentiment_abs"], x["time_published"]), reverse=True)
        
        if not news_list:
            return [{
                "title": "No news available",
                "summary": "Please select at least one industry to view news." if not industries else "No news found for the selected industries.",
                "url": "",  # 移除链接
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
