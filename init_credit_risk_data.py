import sqlite3
import random
from datetime import datetime
from config import CREDIT_RISK_DB_PATH, DEFAULT_INDUSTRIES, HEALTHCARE_SUB_INDUSTRIES, SOLAR_ENERGY_SUB_INDUSTRIES, TECHNOLOGY_SUB_INDUSTRIES, AI_SUB_INDUSTRIES

def init_credit_risk_data():
    conn = sqlite3.connect(CREDIT_RISK_DB_PATH)
    cursor = conn.cursor()

    # Create credit_risk table if it doesn't exist
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS credit_risk (
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
        "Financial Coverage Ratio" REAL,
        "Probability of Credit Rating Change" REAL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Clear existing data
    cursor.execute('DELETE FROM credit_risk')

    # Credit ratings from best to worst
    credit_ratings = ['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-', 'BB+', 'BB', 'BB-', 'B+', 'B', 'B-', 'CCC+', 'CCC', 'CCC-']

    # Industry mapping
    industry_mapping = {
        'Healthcare': HEALTHCARE_SUB_INDUSTRIES,
        'Solar Energy': SOLAR_ENERGY_SUB_INDUSTRIES,
        'Technology': TECHNOLOGY_SUB_INDUSTRIES,
        'AI': AI_SUB_INDUSTRIES
    }

    # Generate sample companies
    companies = []
    for industry in DEFAULT_INDUSTRIES:
        sub_industries = industry_mapping[industry]
        for sub_industry in sub_industries:
            # Generate 5 companies per sub-industry
            for i in range(5):
                company_name = f"{sub_industry.replace(' ', '_')}_{i+1}"
                
                # Assign credit rating based on random factors
                credit_rating = random.choice(credit_ratings)
                
                # Calculate probability of default based on credit rating
                # Better ratings have lower PD
                pd_base = credit_ratings.index(credit_rating) / len(credit_ratings)
                pd = round(pd_base * random.uniform(0.05, 0.15), 4)
                
                # Calculate other metrics
                lgd = round(random.uniform(0.3, 0.6), 2)
                loan_amount = round(random.uniform(500000, 5000000), 2)
                expected_loss = round(pd * lgd * loan_amount, 2)
                current_ratio = round(random.uniform(0.8, 3.0), 2)
                roa = round(random.uniform(-0.05, 0.15), 4)
                roe = round(random.uniform(-0.1, 0.25), 4)
                leverage_ratio = round(random.uniform(0.2, 0.8), 2)
                credit_var = round(random.uniform(0.05, 0.20), 4)
                
                # Calculate Financial Coverage Ratio based on company's risk profile
                # Better credit ratings typically have higher coverage ratios
                base_coverage = (len(credit_ratings) - credit_ratings.index(credit_rating)) / len(credit_ratings)
                financial_coverage = round(
                    (base_coverage * 5 + 1) *  # Base range of 1-6x
                    (1 + roa * 2) *            # Adjust based on ROA
                    (1 - leverage_ratio * 0.3)  # Reduce for high leverage
                    * random.uniform(0.8, 1.2),  # Add some randomness
                    2
                )
                
                # Ensure Financial Coverage Ratio is more noticeable
                if credit_rating in ['AAA', 'AA+', 'AA']:
                    financial_coverage = max(financial_coverage, 3.0)  # Ensure high ratings have high coverage
                elif credit_rating in ['CCC+', 'CCC', 'CCC-']:
                    financial_coverage = min(financial_coverage, 1.2)  # Ensure low ratings have low coverage

                # Calculate probability of credit rating change based on metrics
                rating_change_prob = round(
                    (abs(current_ratio - 1.5) / 1.5 * 0.2 +  # Further from ideal ratio (1.5) increases probability
                     abs(leverage_ratio - 0.5) / 0.5 * 0.3 +  # Further from ideal leverage (0.5) increases probability
                     (0.1 - roa if roa < 0.1 else 0) * 2 +    # Lower ROA increases probability
                     (0.15 - roe if roe < 0.15 else 0) * 2 +  # Lower ROE increases probability
                     (2 - financial_coverage if financial_coverage < 2 else 0) * 0.3  # Lower coverage ratio increases probability
                    ) * random.uniform(0.8, 1.2),  # Add some randomness
                    4
                )
                # Clamp the probability between 0 and 1
                rating_change_prob = max(0, min(1, rating_change_prob))

                companies.append((
                    company_name,
                    industry,
                    sub_industry,
                    credit_rating,
                    pd,
                    lgd,
                    expected_loss,
                    current_ratio,
                    roa,
                    roe,
                    leverage_ratio,
                    credit_var,
                    loan_amount,
                    financial_coverage,
                    rating_change_prob,
                    datetime.now().isoformat()
                ))

    # Insert data
    cursor.executemany('''
    INSERT INTO credit_risk (
        Company, Industry, "Sub-Industry", "Credit Rating",
        "Probability of Default", "Loss Given Default", "Expected Loss",
        "Current Ratio", "ROA", "ROE", "Leverage Ratio", "Credit VaR",
        "Loan Amount", "Financial Coverage Ratio", "Probability of Credit Rating Change",
        created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', companies)

    # Commit changes and close connection
    conn.commit()
    conn.close()

    print(f"Successfully populated credit_risk table with {len(companies)} companies")

if __name__ == '__main__':
    init_credit_risk_data() 