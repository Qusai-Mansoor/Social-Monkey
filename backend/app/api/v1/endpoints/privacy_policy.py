from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.twitter_service import twitter_service
from app.schemas.social import SocialAccountResponse, OAuthCallback
from app.core.security import verify_token
from fastapi.responses import HTMLResponse


router = APIRouter()

@router.get("/privacy-policy", response_class=HTMLResponse)
async def privacy_policy():
    """Privacy Policy page required for OAuth providers"""
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Privacy Policy - Social Monkey</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                color: #333;
            }
            h1 {
                color: #2c3e50;
                border-bottom: 3px solid #3498db;
                padding-bottom: 10px;
            }
            h2 {
                color: #34495e;
                margin-top: 30px;
            }
            .last-updated {
                color: #7f8c8d;
                font-style: italic;
            }
            .section {
                margin: 20px 0;
            }
            .highlight {
                background-color: #fff3cd;
                padding: 15px;
                border-left: 4px solid #ffc107;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <h1>Privacy Policy</h1>
        <p class="last-updated">Last Updated: January 2025</p>
        
        <div class="highlight">
            <strong>Your Privacy Matters:</strong> Social Monkey is committed to protecting your privacy and 
            being transparent about how we collect, use, and protect your data.
        </div>
        
        <div class="section">
            <h2>1. Information We Collect</h2>
            
            <h3>1.1 Account Information</h3>
            <p>When you create an account, we collect:</p>
            <ul>
                <li>Email address</li>
                <li>Username</li>
                <li>Password (stored encrypted)</li>
            </ul>
            
            <h3>1.2 Social Media Data</h3>
            <p>When you connect your social media accounts, we collect:</p>
            <ul>
                <li>Public posts and tweets</li>
                <li>Comments and replies on your posts</li>
                <li>Engagement metrics (likes, shares, retweets, replies count)</li>
                <li>Post timestamps and metadata</li>
                <li>Public profile information (username, user ID)</li>
            </ul>
            
            <h3>1.3 Usage Data</h3>
            <p>We automatically collect:</p>
            <ul>
                <li>Log data (IP address, browser type, access times)</li>
                <li>Service usage patterns</li>
                <li>API request logs</li>
            </ul>
        </div>
        
        <div class="section">
            <h2>2. How We Use Your Information</h2>
            <p>We use the collected information to:</p>
            <ul>
                <li><strong>Provide the Service:</strong> Analyze your social media content for emotional insights 
                and engagement patterns</li>
                <li><strong>Improve the Service:</strong> Enhance our algorithms and user experience</li>
                <li><strong>Communicate:</strong> Send you service-related notifications and updates</li>
                <li><strong>Security:</strong> Protect against fraud, abuse, and security issues</li>
                <li><strong>Compliance:</strong> Meet legal obligations and enforce our terms</li>
            </ul>
        </div>
        
        <div class="section">
            <h2>3. Data Storage and Security</h2>
            <p>We implement industry-standard security measures:</p>
            <ul>
                <li><strong>Encryption:</strong> All OAuth tokens are encrypted using Fernet symmetric encryption</li>
                <li><strong>Secure Storage:</strong> Data is stored in secure PostgreSQL databases</li>
                <li><strong>Password Security:</strong> Passwords are hashed using bcrypt</li>
                <li><strong>HTTPS:</strong> All data transmission uses secure HTTPS connections</li>
                <li><strong>Access Control:</strong> Strict access controls limit who can access your data</li>
            </ul>
        </div>
        
        <div class="section">
            <h2>4. Data Sharing and Disclosure</h2>
            <p><strong>We do NOT sell your data.</strong></p>
            
            <p>We may share your information only in the following circumstances:</p>
            <ul>
                <li><strong>With Your Consent:</strong> When you explicitly authorize us to share information</li>
                <li><strong>Service Providers:</strong> With trusted third-party services that help us operate 
                (hosting, analytics), under strict confidentiality agreements</li>
                <li><strong>Legal Requirements:</strong> When required by law, subpoena, or legal process</li>
                <li><strong>Safety and Security:</strong> To protect the rights, property, or safety of Social Monkey, 
                our users, or others</li>
            </ul>
        </div>
        
        <div class="section">
            <h2>5. Third-Party Platform Policies</h2>
            <p>
                When you connect social media accounts, you also agree to the privacy policies of those platforms:
            </p>
            <ul>
                <li><a href="https://twitter.com/privacy" target="_blank">Twitter Privacy Policy</a></li>
                <li><a href="https://help.instagram.com/519522125107875" target="_blank">Instagram Privacy Policy</a></li>
            </ul>
            <p>
                We access your data through official APIs in accordance with these platforms' policies.
            </p>
        </div>
        
        <div class="section">
            <h2>6. Data Retention</h2>
            <p>
                We retain your data only as long as necessary to provide the Service. Specifically:
            </p>
            <ul>
                <li>Social media posts and comments are stored until you disconnect your account or request deletion</li>
                <li>Account information is retained while your account is active</li>
                <li>After account deletion, data is removed within 30 days, except where legally required</li>
                <li>Anonymized analytics data may be retained longer for service improvement</li>
            </ul>
        </div>
        
        <div class="section">
            <h2>7. Your Privacy Rights</h2>
            <p>You have the right to:</p>
            <ul>
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct your information</li>
                <li><strong>Deletion:</strong> Request deletion of your data ("right to be forgotten")</li>
                <li><strong>Portability:</strong> Receive your data in a portable format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                <li><strong>Disconnect:</strong> Revoke access to your social media accounts at any time</li>
            </ul>
            
            <p>To exercise these rights, contact us at <a href="mailto:privacy@socialmonkey.app">privacy@socialmonkey.app</a></p>
        </div>
        
        <div class="section">
            <h2>8. Cookies and Tracking</h2>
            <p>
                We use essential cookies to maintain your session and preferences. We do not use third-party 
                advertising cookies. You can control cookie preferences through your browser settings.
            </p>
        </div>
        
        <div class="section">
            <h2>9. Children's Privacy</h2>
            <p>
                Social Monkey is not intended for users under the age of 13 (or 16 in the EU). We do not knowingly 
                collect personal information from children. If we learn that we have collected information from a 
                child, we will delete it immediately.
            </p>
        </div>
        
        <div class="section">
            <h2>10. International Data Transfers</h2>
            <p>
                Your data may be transferred to and processed in countries other than your country of residence. 
                We ensure appropriate safeguards are in place to protect your data in accordance with this privacy policy.
            </p>
        </div>
        
        <div class="section">
            <h2>11. Changes to This Privacy Policy</h2>
            <p>
                We may update this Privacy Policy from time to time. We will notify you of any material changes by:
            </p>
            <ul>
                <li>Posting the new Privacy Policy on this page</li>
                <li>Updating the "Last Updated" date</li>
                <li>Sending you an email notification (for significant changes)</li>
            </ul>
        </div>
        
        <div class="section">
            <h2>12. Contact Us</h2>
            <p>If you have questions or concerns about this Privacy Policy or our data practices, please contact us:</p>
            <ul>
                <li><strong>Email:</strong> <a href="mailto:privacy@socialmonkey.app">privacy@socialmonkey.app</a></li>
                <li><strong>Support:</strong> <a href="mailto:support@socialmonkey.app">support@socialmonkey.app</a></li>
            </ul>
        </div>
        
        <div class="section">
            <h2>13. GDPR Compliance (EU Users)</h2>
            <p>
                If you are located in the European Economic Area (EEA), you have additional rights under GDPR:
            </p>
            <ul>
                <li>The right to object to processing</li>
                <li>The right to restrict processing</li>
                <li>The right to lodge a complaint with a supervisory authority</li>
            </ul>
            <p>
                Our legal basis for processing your data is your consent, which you provide when connecting your 
                social media accounts.
            </p>
        </div>
        
        <div class="section">
            <h2>14. California Privacy Rights (CCPA)</h2>
            <p>
                California residents have specific rights under the California Consumer Privacy Act (CCPA):
            </p>
            <ul>
                <li>Right to know what personal information is collected</li>
                <li>Right to know if personal information is sold or shared</li>
                <li>Right to opt-out of the sale of personal information</li>
                <li>Right to deletion of personal information</li>
                <li>Right to non-discrimination for exercising CCPA rights</li>
            </ul>
            <p><strong>Note:</strong> We do not sell personal information.</p>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)