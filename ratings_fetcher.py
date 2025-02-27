import yfinance as yf
import pandas as pd
from datetime import datetime

def get_company_ratings():
    # Define the list of stock tickers to track
    tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META']
    
    ratings_list = []
    
    for ticker in tickers:
        try:
            print(f"Fetching data for {ticker}...")  # Debug information
            
            # Get stock information
            stock = yf.Ticker(ticker)
            
            # Get analyst recommendations
            recommendations = stock.recommendations
            if recommendations is not None and not recommendations.empty:
                # Get the latest rating
                latest_rating = recommendations.iloc[-1]
                
                # Print debug information
                print(f"Found rating for {ticker}:")
                print(latest_rating)
                
                rating_info = {
                    "company": stock.info.get('longName', ticker),
                    "ticker": ticker,
                    "rating": latest_rating.get('To Grade', 'N/A'),
                    "previous_rating": latest_rating.get('From Grade', 'N/A'),
                    "firm": latest_rating.get('Firm', 'N/A'),
                    "date": latest_rating.name.strftime("%Y-%m-%d") if hasattr(latest_rating, 'name') else 'N/A',
                    "current_price": f"${stock.info.get('currentPrice', 'N/A')}",
                    "target_price": f"${stock.info.get('targetMeanPrice', 'N/A')}"
                }
                ratings_list.append(rating_info)
            else:
                print(f"No recommendations found for {ticker}")
                # Add basic information as fallback
                rating_info = {
                    "company": stock.info.get('longName', ticker),
                    "ticker": ticker,
                    "rating": "N/A",
                    "previous_rating": "N/A",
                    "firm": "N/A",
                    "date": "N/A",
                    "current_price": f"${stock.info.get('currentPrice', 'N/A')}",
                    "target_price": f"${stock.info.get('targetMeanPrice', 'N/A')}"
                }
                ratings_list.append(rating_info)
                
        except Exception as e:
            print(f"Error fetching data for {ticker}: {str(e)}")
            # Add error information as fallback
            ratings_list.append({
                "company": ticker,
                "ticker": ticker,
                "rating": "Error",
                "previous_rating": "Error",
                "firm": "N/A",
                "date": "N/A",
                "current_price": "N/A",
                "target_price": "N/A"
            })
            continue
    
    # Add a default message if the list is empty
    if not ratings_list:
        ratings_list.append({
            "company": "Data Unavailable",
            "ticker": "N/A",
            "rating": "N/A",
            "previous_rating": "N/A",
            "firm": "N/A",
            "date": "N/A",
            "current_price": "N/A",
            "target_price": "N/A"
        })
    
    return ratings_list 