import { Monitor, Apple, Sparkles, MessageCircle, Globe } from 'lucide-react';
import './index.css';

const REPO_URL = 'https://github.com/urraf/LeadGen-Software';

function App() {
  return (
    <div className="app-container">
      {/* Navigation */}
      <nav className="navbar">
        <div className="container nav-content">
          <div className="brand">
            <div className="logo-box">
              <Sparkles className="icon-brand" />
            </div>
            <span className="brand-text">LeadGen Pro</span>
          </div>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="nav-link">
            GitHub
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container hero-section">
        <div className="hero-content animate-slide-up">
          <div className="version-badge glass-card">
            <span className="pulse-dot"></span>
            <span className="version-text">v1.0.0 is now available</span>
          </div>
          
          <h1 className="hero-title">
            The AI-Powered <br />
            <span className="text-gradient">Lead Generation</span> Engine.
          </h1>
          
          <p className="hero-subtitle">
            Automatically discover, qualify, and contact high-value leads from Google Maps. 
            Stop scraping. Start selling.
          </p>

          {/* Download Buttons */}
          <div className="download-group animate-slide-up delay-100">
            <a href={`${REPO_URL}/releases/latest/download/LeadGen.Pro-Setup-1.0.0.exe`} className="btn btn-windows">
              <Monitor className="btn-icon" />
              <div className="btn-text">
                <div className="btn-label">Download for</div>
                <div className="btn-title">Windows</div>
              </div>
            </a>

            <a href={`${REPO_URL}/releases/latest/download/LeadGen.Pro-1.0.0-arm64.dmg`} className="btn btn-primary">
              <Apple className="btn-icon" />
              <div className="btn-text">
                <div className="btn-label">Download for</div>
                <div className="btn-title">Mac (Silicon)</div>
              </div>
            </a>
            
             <a href={`${REPO_URL}/releases/latest/download/LeadGen.Pro-1.0.0-x64.dmg`} className="btn btn-secondary">
              <Apple className="btn-icon" />
              <div className="btn-text">
                <div className="btn-label">Download for</div>
                <div className="btn-title">Mac (Intel)</div>
              </div>
            </a>
          </div>
          
          <p className="disclaimer animate-slide-up delay-200">
            Free and open-source. Requires your own API keys.
          </p>
        </div>

        {/* System Requirements */}
        <div className="sys-req-section animate-slide-up delay-300">
          <h3 className="sys-req-title">System Requirements</h3>
          <div className="sys-req-grid">
            <div className="sys-req-card glass-card">
              <h4>Windows</h4>
              <ul>
                <li>Windows 10 or 11 (64-bit)</li>
                <li>4GB RAM minimum (8GB recommended)</li>
                <li>Internet connection for AI & Search</li>
                <li>Active WhatsApp account on phone</li>
              </ul>
            </div>
            <div className="sys-req-card glass-card">
              <h4>macOS</h4>
              <ul>
                <li>macOS 10.15 (Catalina) or later</li>
                <li>Apple Silicon (M1/M2/M3) or Intel Core i5+</li>
                <li>4GB RAM minimum (8GB recommended)</li>
                <li>Internet connection for AI & Search</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="features-grid animate-slide-up delay-300">
          <div className="glass-card feature-card glass-card-hover">
            <div className="feature-icon-box box-green">
              <Sparkles className="feature-icon icon-green" />
            </div>
            <h3 className="feature-title">AI Qualification</h3>
            <p className="feature-desc">
              Llama 3.3 automatically reads reviews, assesses business health, and filters out bad leads before you ever see them.
            </p>
          </div>

          <div className="glass-card feature-card glass-card-hover">
            <div className="feature-icon-box box-blue">
              <MessageCircle className="feature-icon icon-blue" />
            </div>
            <h3 className="feature-title">Multi-Channel Outreach</h3>
            <p className="feature-desc">
              Generate hyper-personalized messages and automatically dispatch them via WhatsApp, Email, or Instagram DMs.
            </p>
          </div>

          <div className="glass-card feature-card glass-card-hover">
            <div className="feature-icon-box box-purple">
              <Globe className="feature-icon icon-purple" />
            </div>
            <h3 className="feature-title">Website Audits</h3>
            <p className="feature-desc">
              Automatically scores existing websites for speed and mobile readiness to help you pitch high-ticket redesigns.
            </p>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="footer">
        <div className="container footer-content">
          <p>© {new Date().getFullYear()} LeadGen Pro. Built for modern agencies.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
