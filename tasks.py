from celery import Celery
from datetime import datetime, timedelta
import sqlite3
import os
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
import smtplib
from twilio.rest import Client
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
import uuid
from config import DB_PATH, CREDIT_RISK_DB_PATH, REPORT_DIR

# Setup Celery
celery = Celery('tasks')
celery.conf.broker_url = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
celery.conf.result_backend = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')

# Configuration
EMAIL_SERVER = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USER = os.getenv('EMAIL_USER')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_PHONE = os.getenv('TWILIO_PHONE')

# Email configs
SENDGRID_API_KEY = os.getenv('SENDGRID_API_KEY')
EMAIL_SENDER = os.getenv('EMAIL_SENDER')

def get_db_connection():
    return sqlite3.connect(DB_PATH)

@celery.task
def schedule_alert_check(alert_id):
    """Schedule periodic checks for an alert"""
    check_alert.apply_async((alert_id,), countdown=300)  # Check every 5 minutes

@celery.task
def check_alert(alert_id):
    """Check if alert conditions are met and send notifications"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get alert details
        cursor.execute('''
            SELECT company_name, metric, condition, threshold,
                   notify_email, notify_sms, notify_dashboard,
                   email, phone
            FROM alerts
            WHERE id = ?
        ''', (alert_id,))
        
        alert = cursor.fetchone()
        if not alert:
            return
            
        # Get current metric value
        company_name, metric, condition, threshold = alert[:4]
        current_value = get_metric_value(company_name, metric)
        
        # Check if condition is met
        is_triggered = False
        if condition == 'above' and current_value > threshold:
            is_triggered = True
        elif condition == 'below' and current_value < threshold:
            is_triggered = True
        elif condition == 'equals' and current_value == threshold:
            is_triggered = True
            
        if is_triggered:
            # Update last triggered time
            cursor.execute('''
                UPDATE alerts
                SET last_triggered_at = ?
                WHERE id = ?
            ''', (datetime.now().isoformat(), alert_id))
            
            # Send notifications
            message = f"Alert for {company_name}: {metric} is {condition} {threshold} (Current value: {current_value})"
            
            if alert[4]:  # notify_email
                send_email_notification.delay(alert[7], message)
            
            if alert[5]:  # notify_sms
                send_sms_notification.delay(alert[8], message)
            
            if alert[6]:  # notify_dashboard
                add_dashboard_notification(alert_id, message)
        
        # Update last checked time
        cursor.execute('''
            UPDATE alerts
            SET last_checked_at = ?
            WHERE id = ?
        ''', (datetime.now().isoformat(), alert_id))
        
        conn.commit()
        
    except Exception as e:
        print(f"Error checking alert {alert_id}: {str(e)}")
    finally:
        conn.close()
        # Schedule next check
        schedule_alert_check.delay(alert_id)

@celery.task
def schedule_recurring_report(report_id):
    """Schedule recurring report generation"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT schedule FROM reports WHERE report_id = ?', (report_id,))
        schedule = cursor.fetchone()[0]
        
        if schedule == 'daily':
            delay = timedelta(days=1)
        elif schedule == 'weekly':
            delay = timedelta(weeks=1)
        elif schedule == 'monthly':
            delay = timedelta(days=30)
        else:
            return
            
        generate_scheduled_report.apply_async((report_id,), countdown=delay.total_seconds())
        
    finally:
        conn.close()

@celery.task
def generate_scheduled_report(report_id):
    """Generate a scheduled report"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get report details
        cursor.execute('''
            SELECT company_name, sections, delivery_email, email
            FROM reports
            WHERE report_id = ?
        ''', (report_id,))
        
        report = cursor.fetchone()
        if not report:
            return
            
        company_name, sections, delivery_email, email = report
        sections = json.loads(sections)
        
        # Generate report
        report_data = generate_company_report(company_name, sections)
        
        # Create PDF
        new_report_id = str(uuid.uuid4())
        report_filename = f"report_{new_report_id}.pdf"
        report_path = os.path.join(REPORT_DIR, report_filename)
        
        create_pdf_report(report_data, report_path)
        
        # Record in history
        cursor.execute('''
            INSERT INTO report_history (
                report_id, generated_at, file_path,
                status, error_message
            ) VALUES (?, ?, ?, ?, ?)
        ''', (
            report_id,
            datetime.now().isoformat(),
            report_path,
            'completed',
            None
        ))
        
        # Update last generated time
        cursor.execute('''
            UPDATE reports
            SET last_generated_at = ?
            WHERE report_id = ?
        ''', (datetime.now().isoformat(), report_id))
        
        conn.commit()
        
        # Send email if configured
        if delivery_email and email:
            send_report_email.delay(email, report_path, company_name)
            
    except Exception as e:
        # Record error in history
        cursor.execute('''
            INSERT INTO report_history (
                report_id, generated_at, file_path,
                status, error_message
            ) VALUES (?, ?, ?, ?, ?)
        ''', (
            report_id,
            datetime.now().isoformat(),
            None,
            'failed',
            str(e)
        ))
        conn.commit()
        
    finally:
        conn.close()
        # Schedule next generation
        schedule_recurring_report.delay(report_id)

@celery.task
def send_email_notification(email, message):
    """Send email notification"""
    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_USER
        msg['To'] = email
        msg['Subject'] = "NewsDesk Alert Notification"
        
        msg.attach(MIMEText(message, 'plain'))
        
        server = smtplib.SMTP(EMAIL_SERVER, EMAIL_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        
    except Exception as e:
        print(f"Error sending email notification: {str(e)}")

@celery.task
def send_sms_notification(phone, message):
    """Send SMS notification"""
    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        client.messages.create(
            body=message,
            from_=TWILIO_PHONE,
            to=phone
        )
        
    except Exception as e:
        print(f"Error sending SMS notification: {str(e)}")

@celery.task
def send_report_email(email, report_path, company_name):
    """Send report via email"""
    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_USER
        msg['To'] = email
        msg['Subject'] = f"NewsDesk Report - {company_name}"
        
        body = f"Please find attached the report for {company_name}."
        msg.attach(MIMEText(body, 'plain'))
        
        with open(report_path, 'rb') as f:
            pdf = MIMEApplication(f.read(), _subtype='pdf')
            pdf.add_header('Content-Disposition', 'attachment', filename=os.path.basename(report_path))
            msg.attach(pdf)
        
        server = smtplib.SMTP(EMAIL_SERVER, EMAIL_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        
    except Exception as e:
        print(f"Error sending report email: {str(e)}")

def add_dashboard_notification(alert_id, message):
    """Add notification to dashboard"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO notifications (
                alert_id, message, created_at, read
            ) VALUES (?, ?, ?, ?)
        ''', (
            alert_id,
            message,
            datetime.now().isoformat(),
            False
        ))
        
        conn.commit()
        
    except Exception as e:
        print(f"Error adding dashboard notification: {str(e)}")
    finally:
        conn.close()

def get_metric_value(company_name, metric):
    """Get current value for a company metric"""
    try:
        conn = sqlite3.connect(CREDIT_RISK_DB_PATH)
        cursor = conn.cursor()
        
        # Map metric name to database column
        metric_columns = {
            'PD': 'PD',
            'LGD': 'LGD', 
            'EAD': 'EAD',
            'expected_loss': 'Expected_Loss',
            'credit_rating': 'Credit_Rating',
            'current_ratio': 'Current_Ratio',
            'roe': 'ROE',
            'leverage_ratio': 'Leverage_Ratio'
        }
        
        column = metric_columns.get(metric)
        if not column:
            return None
            
        # Get the value from the database
        cursor.execute(f"SELECT {column} FROM credit_risk WHERE Company = ?", (company_name,))
        result = cursor.fetchone()
        
        return result[0] if result else None
    except Exception as e:
        print(f"Error getting metric value: {str(e)}")
        return None
    finally:
        conn.close()

def generate_company_report(company_name, sections, schedule=None):
    """Generate report data for a company"""
    try:
        conn = sqlite3.connect(CREDIT_RISK_DB_PATH)
        cursor = conn.cursor()
        
        # Get company data
        cursor.execute("SELECT * FROM credit_risk WHERE Company = ?", (company_name,))
        columns = [column[0] for column in cursor.description]
        row = cursor.fetchone()
        
        if not row:
            return None
            
        # Create report data dictionary
        company_data = {}
        for i, column in enumerate(columns):
            company_data[column] = row[i]
            
        # Create report data structure
        report_data = {
            'company_name': company_name,
            'generated_date': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'schedule': schedule,
            'sections': {}
        }
        
        # Add requested sections to report
        if 'risk_profile' in sections:
            report_data['sections']['risk_profile'] = {
                'title': 'Risk Profile',
                'data': {
                    'PD': company_data.get('PD'),
                    'LGD': company_data.get('LGD'),
                    'EAD': company_data.get('EAD'),
                    'Expected_Loss': company_data.get('Expected_Loss'),
                    'Credit_Rating': company_data.get('Credit_Rating'),
                    'Risk_Level': company_data.get('Risk_Level')
                }
            }
            
        if 'financial_metrics' in sections:
            report_data['sections']['financial_metrics'] = {
                'title': 'Financial Metrics',
                'data': {
                    'Current_Ratio': company_data.get('Current_Ratio'),
                    'ROE': company_data.get('ROE'),
                    'Leverage_Ratio': company_data.get('Leverage_Ratio'),
                    'Revenue': company_data.get('Revenue'),
                    'Net_Income': company_data.get('Net_Income')
                }
            }
            
        if 'company_info' in sections:
            report_data['sections']['company_info'] = {
                'title': 'Company Information',
                'data': {
                    'Company': company_data.get('Company'),
                    'Industry': company_data.get('Industry'),
                    'Ticker': company_data.get('Ticker'),
                    'Founded': company_data.get('Founded'),
                    'Employees': company_data.get('Employees'),
                    'HQ_Location': company_data.get('HQ_Location')
                }
            }
            
        if 'historical_data' in sections:
            # For demo purposes, generate some fake historical data
            # In a real system, this would come from a database with time series data
            report_data['sections']['historical_data'] = {
                'title': 'Historical Performance',
                'data': {
                    'dates': ['2023-Q1', '2023-Q2', '2023-Q3', '2023-Q4', '2024-Q1'],
                    'pd_values': [company_data.get('PD') * 0.9, company_data.get('PD') * 0.95, 
                                  company_data.get('PD'), company_data.get('PD') * 1.02, 
                                  company_data.get('PD') * 1.05],
                    'expected_loss_values': [company_data.get('Expected_Loss') * 0.9, 
                                            company_data.get('Expected_Loss') * 0.95,
                                            company_data.get('Expected_Loss'),
                                            company_data.get('Expected_Loss') * 1.03,
                                            company_data.get('Expected_Loss') * 1.07]
                }
            }
            
        # Record report in database
        report_id = str(uuid.uuid4())
        date_created = datetime.datetime.now().isoformat()
        
        # Get user ID from username (would need to modify for production use)
        conn_users = sqlite3.connect(DB_PATH)
        c_users = conn_users.cursor()
        c_users.execute("SELECT id FROM users WHERE username = 'admin'")  # Replace with actual username logic
        user_id = c_users.fetchone()[0]
        conn_users.close()
        
        # Insert report record
        cursor.execute('''
        INSERT INTO reports (report_id, user_id, company_name, sections, created_at, schedule_type)
        VALUES (?, ?, ?, ?, ?, ?)
        ''', (report_id, user_id, company_name, json.dumps(sections), date_created, schedule or 'once'))
        
        conn.commit()
        
        # Return report data and ID
        return {
            'report_id': report_id,
            'report_data': report_data
        }
        
    except Exception as e:
        print(f"Error generating report: {str(e)}")
        return None
    finally:
        conn.close()

def create_pdf_report(report_data, output_path):
    """Create PDF report from report data"""
    try:
        print(f"Creating PDF report at: {output_path}")
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Initialize PDF document
        print(f"Initializing PDF document")
        doc = SimpleDocTemplate(output_path, pagesize=letter)
        styles = getSampleStyleSheet()
        
        # Create custom styles
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=18,
            alignment=1,  # Center alignment
            spaceAfter=12
        )
        
        section_title_style = ParagraphStyle(
            'SectionTitleStyle',
            parent=styles['Heading2'],
            fontSize=14,
            spaceBefore=10,
            spaceAfter=6
        )
        
        # Build document content
        content = []
        
        # Add logo if available
        try:
            logo_path = os.path.join(os.path.dirname(os.path.dirname(output_path)), 'static', 'images', 'bank1.png')
            if os.path.exists(logo_path):
                img = Image(logo_path, width=100, height=50)
                content.append(img)
                content.append(Spacer(1, 10))
        except Exception as e:
            print(f"Error adding logo: {e}")
        
        # Add title
        content.append(Paragraph(f"LiveOak Bank - Credit Risk Report", title_style))
        content.append(Paragraph(f"{report_data['company_name']}", styles['Heading2']))
        content.append(Paragraph(f"Generated: {report_data['generated_date']}", styles['Normal']))
        content.append(Spacer(1, 24))
        
        # Add sections
        for section_key, section in report_data['sections'].items():
            print(f"Adding section: {section_key}")
            content.append(Paragraph(section['title'], section_title_style))
            
            # Display section data
            if section_key in ['risk_profile', 'financial_metrics', 'company_info']:
                # Create a table for the data
                data = []
                data.append(["Metric", "Value"])  # Table header
                
                for metric, value in section['data'].items():
                    if value is not None:
                        # Format the value based on its type
                        if isinstance(value, float):
                            if metric.lower() in ['pd', 'lgd', 'roe', 'roa']:
                                formatted_value = f"{value * 100:.2f}%"
                            elif metric.lower().endswith('_ratio'):
                                formatted_value = f"{value:.2f}"
                            else:
                                formatted_value = f"${value:.2f}" if value >= 1 else f"{value:.2f}"
                        else:
                            formatted_value = str(value)
                            
                        # Replace underscores with spaces and capitalize for display
                        display_metric = metric.replace('_', ' ').title()
                        data.append([display_metric, formatted_value])
                
                # Create the table
                if len(data) > 1:  # Only if we have data beyond the header
                    table = Table(data, colWidths=[200, 200])
                    table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (1, 0), colors.lightgrey),
                        ('TEXTCOLOR', (0, 0), (1, 0), colors.black),
                        ('ALIGN', (0, 0), (1, 0), 'CENTER'),
                        ('FONTNAME', (0, 0), (1, 0), 'Helvetica-Bold'),
                        ('BOTTOMPADDING', (0, 0), (1, 0), 12),
                        ('BACKGROUND', (0, 1), (1, -1), colors.white),
                        ('GRID', (0, 0), (1, -1), 0.5, colors.black),
                        ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
                    ]))
                    content.append(table)
                    content.append(Spacer(1, 12))
            
            # Special handling for historical data
            elif section_key == 'historical_data' and 'data' in section:
                # Create a description
                content.append(Paragraph("Historical performance data for the company:", styles['Normal']))
                content.append(Spacer(1, 6))
                
                # Format historical data into a table
                hist_data = section['data']
                table_data = []
                
                # Header row
                headers = ["Date"]
                if 'pd_values' in hist_data:
                    headers.append("PD (%)")
                if 'expected_loss_values' in hist_data:
                    headers.append("Expected Loss ($)")
                table_data.append(headers)
                
                # Data rows
                for i, date in enumerate(hist_data.get('dates', [])):
                    row = [date]
                    if 'pd_values' in hist_data and i < len(hist_data['pd_values']):
                        row.append(f"{hist_data['pd_values'][i] * 100:.2f}%")
                    if 'expected_loss_values' in hist_data and i < len(hist_data['expected_loss_values']):
                        row.append(f"${hist_data['expected_loss_values'][i]:.2f}")
                    table_data.append(row)
                
                # Create the table
                if len(table_data) > 1:
                    col_widths = [100] + [150] * (len(headers) - 1)
                    table = Table(table_data, colWidths=col_widths)
                    table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
                    ]))
                    content.append(table)
            
            content.append(Spacer(1, 20))
        
        # Add footer
        content.append(Paragraph("CONFIDENTIAL - FOR INTERNAL USE ONLY", styles['Normal']))
        content.append(Paragraph(f"LiveOak Bank Credit Risk Management - {datetime.datetime.now().strftime('%Y')}", styles['Normal']))
        
        # Build the PDF
        doc.build(content)
        
        print(f"PDF report created successfully at: {output_path}")
        return True
        
    except Exception as e:
        print(f"Error creating PDF report: {str(e)}")
        import traceback
        traceback.print_exc()
        return False 