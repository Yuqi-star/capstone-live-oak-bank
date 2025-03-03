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
    """Format API timestamp into a readable format"""
    if not timestamp_str:
        return "N/A"
    
    try:
        # Parse format like 20250227T164413
        year = int(timestamp_str[0:4])
        month = int(timestamp_str[4:6])
        day = int(timestamp_str[6:8])
        hour = int(timestamp_str[9:11])
        minute = int(timestamp_str[11:13])
        
        # Create datetime object
        dt = datetime(year, month, day, hour, minute)
        
        # Return formatted string, e.g. "Feb 27, 2025 4:44 PM"
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
            # Add time range parameter to get news from the last 7 days
            time_from = (datetime.now() - timedelta(days=7)).strftime('%Y%m%dT%H%M')
            base_url = (f"https://www.alphavantage.co/query?"
                       f"function=NEWS_SENTIMENT&"
                       f"apikey={API_KEY}&"
                       f"limit=500&"  # Increase to 500 items
                       f"time_from={time_from}")
            
            # Don't add industry filtering in the API request, but filter in post-processing
            # This allows us to get all news and then filter precisely by selected industries
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
        
        # Convert all industries to lowercase for case-insensitive matching
        industries_lower = [industry.lower() for industry in industries] if industries else []
        search_query_lower = search_query.lower() if search_query else None
        
        # Create mapping of main industries to sub-industries for smarter matching
        main_industries = {
            "healthcare": ["physician offices", "specialty clinics", "home health", "hospitals", 
                          "pharmaceutical", "biotechnology", "medical instrument", "health insurance", 
                          "medical laboratories", "diagnostics"],
            "solar energy": ["solar electric", "solar power", "semiconductor", "pv cell", "solar inverter", 
                            "electrical components", "solar epc", "solar construction", "solar project", 
                            "solar financing", "solar leasing"]
        }
        
        for article in all_news:
            try:
                # Get article industries/topics
                article_industries = [topic.get('topic', '').strip() if isinstance(topic, dict) else topic.strip() 
                                   for topic in article.get("topics", [])]
                article_title = article.get("title", "").lower()
                article_summary = article.get("summary", "").lower()
                
                # Default to not matching
                matched = False
                
                # If there's a search query, prioritize filtering by search query
                if search_query_lower:
                    if (search_query_lower in article_title or 
                        search_query_lower in article_summary or
                        any(search_query_lower in topic.lower() for topic in article_industries)):
                        matched = True
                # Otherwise, if industries are selected, strictly filter by selected industries
                elif industries and industries_lower:
                    # Check if matches main industry or sub-industry
                    for industry_lower in industries_lower:
                        # Direct match of industry name
                        if (industry_lower in article_title or
                            industry_lower in article_summary or
                            any(industry_lower in topic.lower() for topic in article_industries)):
                            matched = True
                            break
                            
                        # Smart matching of main industry related keywords
                        for main_industry, keywords in main_industries.items():
                            if industry_lower == main_industry:
                                # If main industry is selected, check if it contains any related keywords
                                if any(keyword in article_title or 
                                       keyword in article_summary or
                                       any(keyword in topic.lower() for topic in article_industries)
                                       for keyword in keywords):
                                    matched = True
                                    break
                            # If sub-industry is selected, check if it matches that sub-industry
                            elif any(keyword in industry_lower for keyword in keywords):
                                if (industry_lower in article_title or
                                    industry_lower in article_summary or
                                    any(industry_lower in topic.lower() for topic in article_industries)):
                                    matched = True
                                    break
                else:
                    # If no industries are selected and no search query, show a special message
                    matched = False
                
                if matched:
                    sentiment_score = article.get("overall_sentiment_score", 0)
                    news_item = {
                        "title": article.get("title", "No title"),
                        "summary": article.get("summary", "No summary"),
                        "url": article.get("url", "#"),
                        "sentiment": sentiment_score,
                        "sentiment_abs": abs(sentiment_score),
                        "industries": article_industries,  # Use processed topic list
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
