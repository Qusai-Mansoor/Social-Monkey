from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.twitter_service import twitter_service
from app.schemas.social import SocialAccountResponse, OAuthCallback
from app.core.security import verify_token
from fastapi.responses import HTMLResponse

router = APIRouter()

@router.get("/terms-of-service", response_class=HTMLResponse)
async def terms_of_service():
    """Terms of Service page required for OAuth providers"""
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Terms of Service - Social Monkey</title>
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
        </style>
    </head>
    <body>
        <h1>Terms of Service</h1>
        <p class="last-updated">Last Updated: January 2025</p>
        
        <div class="section">
            <h2>1. Acceptance of Terms</h2>
            <p>
                By accessing and using Social Monkey ("the Service"), you accept and agree to be bound by the terms 
                and provision of this agreement. If you do not agree to these terms, please do not use the Service.
            </p>
        </div>
        
        <div class="section">
            <h2>2. Description of Service</h2>
            <p>
                Social Monkey is an emotion-aware social media helper that analyzes user-authorized social media posts 
                and comments to provide emotional insights, engagement forecasting, and post optimization recommendations.
            </p>
            <p>
                The Service connects to your social media accounts (Twitter, Instagram) with your explicit authorization 
                to analyze your public posts and their engagement metrics.
            </p>
        </div>
        
        <div class="section">
            <h2>3. User Authorization and Data Access</h2>
            <p>
                By connecting your social media accounts to Social Monkey, you authorize us to:
            </p>
            <ul>
                <li>Access your public posts and tweets</li>
                <li>Read comments and replies on your posts</li>
                <li>Analyze engagement metrics (likes, shares, comments)</li>
                <li>Store this data temporarily for analysis purposes</li>
            </ul>
            <p>
                We will NEVER:
            </p>
            <ul>
                <li>Post on your behalf without explicit permission</li>
                <li>Access your private messages or direct messages</li>
                <li>Share your data with third parties for marketing purposes</li>
                <li>Sell your data to any third party</li>
            </ul>
        </div>
        
        <div class="section">
            <h2>4. User Responsibilities</h2>
            <p>You agree to:</p>
            <ul>
                <li>Provide accurate registration information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Use the Service in compliance with all applicable laws and regulations</li>
                <li>Not attempt to circumvent any security features of the Service</li>
                <li>Not use the Service for any unlawful or prohibited activities</li>
            </ul>
        </div>
        
        <div class="section">
            <h2>5. Data Usage and Retention</h2>
            <p>
                We collect and process your social media data solely for the purpose of providing emotional analysis 
                and engagement insights. All data is:
            </p>
            <ul>
                <li>Stored securely with encryption</li>
                <li>Processed only for analysis purposes</li>
                <li>Retained only as long as necessary for the Service</li>
                <li>Deleted upon your request or account termination</li>
            </ul>
        </div>
        
        <div class="section">
            <h2>6. Account Termination</h2>
            <p>
                You may disconnect your social media accounts and terminate your use of the Service at any time. 
                Upon termination, we will delete your stored data within 30 days, except where required by law 
                to retain certain information.
            </p>
        </div>
        
        <div class="section">
            <h2>7. Intellectual Property</h2>
            <p>
                The Service, including its original content, features, and functionality, is owned by Social Monkey 
                and is protected by international copyright, trademark, and other intellectual property laws.
            </p>
        </div>
        
        <div class="section">
            <h2>8. Disclaimer of Warranties</h2>
            <p>
                The Service is provided "as is" and "as available" without warranties of any kind, either express 
                or implied. We do not guarantee that the Service will be uninterrupted, secure, or error-free.
            </p>
        </div>
        
        <div class="section">
            <h2>9. Limitation of Liability</h2>
            <p>
                To the maximum extent permitted by law, Social Monkey shall not be liable for any indirect, 
                incidental, special, consequential, or punitive damages resulting from your use of the Service.
            </p>
        </div>
        
        <div class="section">
            <h2>10. Changes to Terms</h2>
            <p>
                We reserve the right to modify these terms at any time. We will notify users of any material 
                changes via email or through the Service. Continued use of the Service after changes constitutes 
                acceptance of the modified terms.
            </p>
        </div>
        
        <div class="section">
            <h2>11. Contact Information</h2>
            <p>
                If you have any questions about these Terms of Service, please contact us at: 
                <a href="mailto:support@socialmonkey.app">support@socialmonkey.app</a>
            </p>
        </div>
        
        <div class="section">
            <h2>12. Compliance with Platform Policies</h2>
            <p>
                Your use of the Service must comply with the terms of service and policies of the social media 
                platforms you connect (Twitter, Instagram, etc.). We are not responsible for any violations of 
                third-party platform policies.
            </p>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)