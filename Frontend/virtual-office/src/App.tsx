// src/App.tsx
import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import GameCanvas from './components/GameCanvas';
import ProximityVideoCall from './components/ProximityVideoCall';
import { ProximityUI } from './components/ProximityUI';

import { authService, User } from './services/AuthService';
import {
  AVATAR_CATALOG,
  AvatarProfile,
  composeAvatarFromProfile,
  normalizeAvatarProfile
} from './services/avatarCatalog';

// Login/Room Selection Modal Component
function AuthModal({
  onJoin,
  initialMode = 'login',
  onBack
}: {
  onJoin: (user: User, room: 'office' | 'conference') => void;
  initialMode?: 'login' | 'signup';
  onBack: () => void;
}) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [room, setRoom] = useState<'office' | 'conference'>('office');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(authService.getUser());
  const initialProfile = normalizeAvatarProfile(currentUser?.avatar_profile);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let res;
      if (isLogin) {
        res = await authService.login(username, password);
      } else {
        res = await authService.signup(username, email, password);
      }
      setCurrentUser(res.user);
      setSelectedSprite(res.user.avatar_sprite || 'worker-yellow');
      setSelectedColor(res.user.avatar_color || '#ffffff');
      setSelectedProfile(normalizeAvatarProfile(res.user.avatar_profile));

      if (res.user.avatar_customized) {
        onJoin(res.user, room);
      } else {
        setShowAvatarSelector(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (currentUser) {
      setLoading(true);
      try {
        // Save selected avatar before joining
        await authService.updateAvatar(selectedSprite, selectedColor, selectedProfile);
        const updatedUser = authService.getUser();
        onJoin(updatedUser!, room);
      } catch (err) {
        setError('Failed to save avatar');
      } finally {
        setLoading(false);
      }
    }
  };

  const [selectedSprite, setSelectedSprite] = useState(currentUser?.avatar_sprite || 'worker-yellow');
  const [selectedColor, setSelectedColor] = useState(currentUser?.avatar_color || '#ffffff');
  const [selectedProfile, setSelectedProfile] = useState<AvatarProfile>(initialProfile);

  if (showAvatarSelector && currentUser) {
    return (
      <div className="modal-overlay">
        <div className="modal-content avatar-modal">
          <h2>Customize Your Avatar</h2>
          <AvatarSelector 
            initialProfile={selectedProfile}
            onSelect={(sprite, color, profile) => {
              setSelectedSprite(sprite);
              setSelectedColor(color);
              setSelectedProfile(profile);
            }}
          />
          <div className="modal-footer">
            <button className="btn-primary" onClick={handleJoin} disabled={loading}>
              {loading ? 'Saving...' : 'Join Game'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{isLogin ? 'Login to Virtual Office' : 'Create Account'}</h2>
        <button type="button" className="btn-secondary" onClick={onBack}>
          Back
        </button>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (Optional)"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="room">Select Room</label>
            <select
              id="room"
              value={room}
              onChange={(e) => setRoom(e.target.value as 'office' | 'conference')}
            >
              <option value="office">Main Office</option>
              <option value="conference">Conference Room</option>
            </select>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>

          <div className="social-row">
            <button type="button" className="btn-social" onClick={() => authService.startOAuthLogin('google')}>
              Continue with Google
            </button>
            <button type="button" className="btn-social" onClick={() => authService.startOAuthLogin('microsoft')}>
              Continue with Microsoft
            </button>
          </div>

          <p className="auth-toggle">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? 'Sign Up' : 'Login'}
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}

function LandingPage({
  onTryFree,
  onLogin,
  onRegister,
  savedUser,
  onContinueSaved
}: {
  onTryFree: () => void;
  onLogin: () => void;
  onRegister: () => void;
  savedUser: User | null;
  onContinueSaved: () => void;
}) {
  const [showProductsOverlay, setShowProductsOverlay] = useState(false);
  const [showResourcesMenu, setShowResourcesMenu] = useState(false);
  const [activeService, setActiveService] = useState('virtual-office');
  const [openServiceModal, setOpenServiceModal] = useState<string | null>(null);

  const serviceDetails: Record<string, {
    title: string;
    status: string;
    intro: string;
    features: string[];
    timeline: string[];
  }> = {
    'virtual-office': {
      title: 'Virtual Office',
      status: 'Live now',
      intro: 'A persistent digital workspace for remote and hybrid teams to collaborate naturally.',
      features: [
        'Real-time movement and presence awareness',
        'Proximity chat and private video call triggers',
        'Room-based workflows for team collaboration',
        'Saved user identity with cross-device continuity'
      ],
      timeline: [
        'Current: Team rooms, avatar presence, chat + call',
        'Next: Meeting templates and workspace presets',
        'Planned: Admin analytics dashboard'
      ]
    },
    'virtual-events': {
      title: 'Virtual Events',
      status: 'Live now',
      intro: 'Interactive event floors for networking, expos, and hybrid meetups in immersive 2D spaces.',
      features: [
        'Audience circulation in event maps',
        'Networking hotspots and spontaneous meetups',
        'Branded event rooms and themed spaces',
        'Guest onboarding with low-friction entry'
      ],
      timeline: [
        'Current: Event floor and attendee interaction',
        'Next: Booth modules and event host controls',
        'Planned: Sponsor and attendance reports'
      ]
    },
    'digital-classroom': {
      title: 'Digital Classroom',
      status: 'Coming soon',
      intro: 'A gamified learning environment for schools and training organizations.',
      features: [
        'Teacher-led classroom zones',
        'Live participation and presence indicators',
        'Learning content corners and assignment spaces',
        'Session-based controls for facilitators'
      ],
      timeline: [
        'Current: Design and scope definition',
        'Next: Pilot release with selected cohorts',
        'Planned: Attendance insights and LMS integrations'
      ]
    },
    'online-hr': {
      title: 'Online HR & Recruitment',
      status: 'Roadmap',
      intro: 'A virtual hiring journey covering recruitment fairs, interviews, and onboarding.',
      features: [
        'Candidate lobby and interview room flows',
        'Recruiter and hiring-manager interaction zones',
        'Employer branding-ready recruitment spaces',
        'Structured onboarding pathways'
      ],
      timeline: [
        'Current: Product roadmap and architecture planning',
        'Next: Recruiter workspace MVP',
        'Planned: Candidate tracking and hiring funnel analytics'
      ]
    }
  };

  const trustedLogos = [
    { name: 'Microsoft', src: 'https://cdn.simpleicons.org/microsoft/7d8196' },
    { name: 'Google', src: 'https://cdn.simpleicons.org/google/7d8196' },
    { name: 'LinkedIn', src: 'https://cdn.simpleicons.org/linkedin/7d8196' },
    { name: 'Github', src: 'https://cdn.simpleicons.org/github/7d8196' },
    { name: 'Discord', src: 'https://cdn.simpleicons.org/discord/7d8196' },
    { name: 'Siemens', src: 'https://cdn.simpleicons.org/siemens/7d8196' },
    { name: 'Capgemini', src: 'https://cdn.simpleicons.org/capgemini/7d8196' },
    { name: 'Renault', src: 'https://cdn.simpleicons.org/renault/7d8196' },
    { name: 'Bosch', src: 'https://cdn.simpleicons.org/bosch/7d8196' },
    { name: 'Meta', src: 'https://cdn.simpleicons.org/meta/7d8196' }
  ];

  const jumpToService = (serviceId: string) => {
    setActiveService(serviceId);
    setShowProductsOverlay(false);
    setTimeout(() => {
      const section = document.getElementById(serviceId);
      section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const scrollToSection = (sectionId: string) => {
    setShowProductsOverlay(false);
    setShowResourcesMenu(false);
    const section = document.getElementById(sectionId);
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="landing-page" onClick={() => {
      setShowProductsOverlay(false);
      setShowResourcesMenu(false);
    }}>
      <div className="landing-nav">
        <div className="brand">workAdventure</div>
        <div className="landing-center-links">
          <button
            className="nav-link-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowProductsOverlay((prev) => !prev);
            }}
          >
            Products {showProductsOverlay ? '▴' : '▾'}
          </button>
          <button
            className="nav-link-btn"
            onClick={(e) => {
              e.stopPropagation();
              scrollToSection('customer-stories');
            }}
          >
            Customer stories
          </button>
          <button
            className="nav-link-btn"
            onClick={(e) => {
              e.stopPropagation();
              scrollToSection('pricing');
            }}
          >
            Pricing
          </button>
          <div className="resources-menu-wrap" onClick={(e) => e.stopPropagation()}>
            <button
              className="nav-link-btn"
              onClick={() => setShowResourcesMenu((prev) => !prev)}
            >
              Resources {showResourcesMenu ? '▴' : '▾'}
            </button>
            {showResourcesMenu && (
              <div className="resources-dropdown">
                <button className="resources-item" onClick={() => scrollToSection('resources-docs')}>Docs</button>
                <button className="resources-item" onClick={() => scrollToSection('resources-help')}>Help Center</button>
                <button className="resources-item" onClick={() => scrollToSection('resources-api')}>API</button>
                <button className="resources-item" onClick={() => scrollToSection('resources-contact')}>Contact</button>
              </div>
            )}
          </div>
        </div>
        <div className="nav-actions">
          <button className="nav-btn" onClick={onLogin}>Login</button>
          <button className="nav-btn nav-primary" onClick={onRegister}>Register</button>
        </div>
      </div>

      {showProductsOverlay && (
        <div className="products-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="products-column">
            <h3>Currently available</h3>
            <h4>Virtual Office</h4>
            <ul>
              <li><button className="overlay-link" onClick={() => jumpToService('virtual-office')}>Team collaboration zones</button></li>
              <li><button className="overlay-link" onClick={() => jumpToService('virtual-office')}>Proximity chat and calls</button></li>
              <li><button className="overlay-link" onClick={() => jumpToService('virtual-office')}>Room-based workspace navigation</button></li>
              <li><button className="overlay-link" onClick={() => jumpToService('virtual-office')}>Guest access with Try for free</button></li>
            </ul>
          </div>
          <div className="products-column">
            <h3>Currently available</h3>
            <h4>Virtual Events</h4>
            <ul>
              <li><button className="overlay-link" onClick={() => jumpToService('virtual-events')}>Live event floor experiences</button></li>
              <li><button className="overlay-link" onClick={() => jumpToService('virtual-events')}>Networking bubbles</button></li>
              <li><button className="overlay-link" onClick={() => jumpToService('virtual-events')}>Interactive attendee movement</button></li>
            </ul>
          </div>
          <div className="products-column">
            <h3>Coming soon</h3>
            <h4>Digital Classroom</h4>
            <ul>
              <li><button className="overlay-link" onClick={() => jumpToService('digital-classroom')}>Teacher-led session rooms</button></li>
              <li><button className="overlay-link" onClick={() => jumpToService('digital-classroom')}>Attendance and activity insights</button></li>
              <li><button className="overlay-link" onClick={() => jumpToService('digital-classroom')}>Learning content spaces</button></li>
            </ul>
          </div>
          <div className="products-column">
            <h3>Planned roadmap</h3>
            <h4>Online HR & Recruitment</h4>
            <ul>
              <li><button className="overlay-link" onClick={() => jumpToService('online-hr')}>Interview-ready virtual booths</button></li>
              <li><button className="overlay-link" onClick={() => jumpToService('online-hr')}>Hiring event templates</button></li>
              <li><button className="overlay-link" onClick={() => jumpToService('online-hr')}>Candidate journey analytics</button></li>
            </ul>
          </div>
        </div>
      )}

      <section className="hero-section">
        <div className="hero-copy">
          <p className="hero-tag">VIRTUAL OFFICE APP / METAVERSE</p>
          <h1>BEST APP FOR VIRTUAL JOB-DATING</h1>
          <p>Create a virtual world where teams meet, talk, and collaborate naturally.</p>
          <div className="hero-actions">
            <button className="btn-primary try-free-btn" onClick={onTryFree}>
              Try for free
            </button>
            {savedUser && (
              <button className="btn-secondary" onClick={onContinueSaved}>
                Continue as {savedUser.username}
              </button>
            )}
          </div>
          <p className="trial-note">
            Trial users get auto-generated names and avatars. Sign in to save profile preferences.
          </p>
        </div>
        <div className="hero-video-card">Live walkthrough preview</div>
      </section>

      <section className="how-section">
        <h2>HOW IT WORKS</h2>
        <p>Move your avatar, start spontaneous conversations, and collaborate in private bubbles.</p>
      </section>

      <section className="services-section">
        <h2>Platform Services</h2>
        <div className="services-grid">
          <article id="virtual-office" className={`service-card ${activeService === 'virtual-office' ? 'active' : ''}`}>
            <h3>Virtual Office</h3>
            <p>Collaborative workspace for remote and hybrid teams with real-time movement and proximity communication.</p>
            <span className="service-badge live">Available now</span>
            <button className="service-more-btn" onClick={() => setOpenServiceModal('virtual-office')}>View details</button>
          </article>
          <article id="virtual-events" className={`service-card ${activeService === 'virtual-events' ? 'active' : ''}`}>
            <h3>Virtual Events</h3>
            <p>Host networking meetups and event floors where participants naturally interact in immersive spaces.</p>
            <span className="service-badge live">Available now</span>
            <button className="service-more-btn" onClick={() => setOpenServiceModal('virtual-events')}>View details</button>
          </article>
          <article id="digital-classroom" className={`service-card ${activeService === 'digital-classroom' ? 'active' : ''}`}>
            <h3>Digital Classroom</h3>
            <p>Planned education experience with learning rooms, teacher controls, and student engagement tracking.</p>
            <span className="service-badge soon">Coming soon</span>
            <button className="service-more-btn" onClick={() => setOpenServiceModal('digital-classroom')}>View details</button>
          </article>
          <article id="online-hr" className={`service-card ${activeService === 'online-hr' ? 'active' : ''}`}>
            <h3>Online HR & Recruitment</h3>
            <p>Upcoming recruitment journeys with virtual interview spaces, onboarding zones, and employer branding.</p>
            <span className="service-badge roadmap">Roadmap</span>
            <button className="service-more-btn" onClick={() => setOpenServiceModal('online-hr')}>View details</button>
          </article>
        </div>
      </section>

      <section id="customer-stories" className="info-section">
        <h2>Customer Stories</h2>
        <p>See how teams are using Virtual Office for hybrid collaboration, hiring events, and digital learning spaces.</p>
      </section>

      <section id="pricing" className="info-section">
        <h2>Pricing</h2>
        <p>Start free as a guest. Upgrade to unlock persistent identity, advanced workspace controls, and organization-level customization.</p>
      </section>

      <section id="resources" className="info-section">
        <h2>Resources</h2>
        <p>Browse onboarding guides, admin setup notes, and best-practice playbooks for building engaging virtual spaces.</p>
      </section>

      <section id="resources-docs" className="info-section info-section-sub">
        <h2>Docs</h2>
        <p>Read setup and deployment guides for admins, space designers, and team leads.</p>
      </section>
      <section id="resources-help" className="info-section info-section-sub">
        <h2>Help Center</h2>
        <p>Get troubleshooting walkthroughs for login, audio, video, and collaboration features.</p>
      </section>
      <section id="resources-api" className="info-section info-section-sub">
        <h2>API</h2>
        <p>Explore integration points for identity providers, room automation, and analytics hooks.</p>
      </section>
      <section id="resources-contact" className="info-section info-section-sub">
        <h2>Contact</h2>
        <p>Reach out for support, onboarding workshops, and enterprise partnership queries.</p>
      </section>

      {openServiceModal && (
        <div className="service-modal-overlay" onClick={() => setOpenServiceModal(null)}>
          <div className="service-modal" onClick={(e) => e.stopPropagation()}>
            <button className="service-modal-close" onClick={() => setOpenServiceModal(null)}>✕</button>
            <h3>{serviceDetails[openServiceModal].title}</h3>
            <p className="service-modal-status">{serviceDetails[openServiceModal].status}</p>
            <p className="service-modal-intro">{serviceDetails[openServiceModal].intro}</p>

            <div className="service-modal-columns">
              <div>
                <h4>Key features</h4>
                <ul>
                  {serviceDetails[openServiceModal].features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>Release timeline</h4>
                <ul>
                  {serviceDetails[openServiceModal].timeline.map((milestone) => (
                    <li key={milestone}>{milestone}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="trusted-section">
        <div className="trusted-track">
          {[...trustedLogos, ...trustedLogos].map((logo, index) => (
            <div className="trusted-logo" key={`${logo.name}-${index}`}>
              <img
                src={logo.src}
                alt={`${logo.name} logo`}
                loading="lazy"
                onError={(e) => {
                  const image = e.currentTarget;
                  image.style.display = 'none';
                  const fallback = image.nextElementSibling as HTMLElement | null;
                  if (fallback) fallback.style.display = 'inline';
                }}
              />
              <span className="trusted-logo-fallback">{logo.name}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SignupPortal({
  onJoin,
  onBack,
  onGoLogin
}: {
  onJoin: (user: User, room: 'office' | 'conference') => void;
  onBack: () => void;
  onGoLogin: () => void;
}) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [room, setRoom] = useState<'office' | 'conference'>('office');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(authService.getUser());
  const [selectedSprite, setSelectedSprite] = useState(currentUser?.avatar_sprite || 'worker-yellow');
  const [selectedColor, setSelectedColor] = useState(currentUser?.avatar_color || '#ffffff');
  const [selectedProfile, setSelectedProfile] = useState<AvatarProfile>(normalizeAvatarProfile(currentUser?.avatar_profile));

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authService.signup(username, email, password);
      setCurrentUser(res.user);
      setSelectedSprite(res.user.avatar_sprite || 'worker-yellow');
      setSelectedColor(res.user.avatar_color || '#ffffff');
      setSelectedProfile(normalizeAvatarProfile(res.user.avatar_profile));

      if (res.user.avatar_customized) {
        onJoin(res.user, room);
      } else {
        setShowAvatarSelector(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
        await authService.updateAvatar(selectedSprite, selectedColor, selectedProfile);
      const updatedUser = authService.getUser();
      onJoin(updatedUser!, room);
    } catch {
      setError('Failed to save avatar');
    } finally {
      setLoading(false);
    }
  };

  if (showAvatarSelector && currentUser) {
    return (
      <div className="modal-overlay">
        <div className="modal-content avatar-modal">
          <h2>Customize Your Avatar</h2>
          <AvatarSelector
            initialProfile={selectedProfile}
            onSelect={(sprite, color, profile) => {
              setSelectedSprite(sprite);
              setSelectedColor(color);
              setSelectedProfile(profile);
            }}
          />
          <div className="modal-footer">
            <button className="btn-primary" onClick={handleJoin} disabled={loading}>
              {loading ? 'Saving...' : 'Join Game'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-portal-wrap">
      <div className="signup-portal-card">
        <div className="signup-social-panel">
          <button className="signup-social-btn" onClick={() => authService.startOAuthLogin('microsoft')}>Microsoft</button>
          <button className="signup-social-btn" onClick={() => authService.startOAuthLogin('google')}>Google</button>
          <button className="signup-social-btn" disabled>LinkedIn</button>
          <button className="signup-social-btn" disabled>Github</button>
          <button className="signup-social-btn" disabled>Discord</button>
          <button className="signup-social-btn" disabled>MetaMask</button>
        </div>

        <div className="signup-divider">OR</div>

        <form className="signup-form-panel" onSubmit={handleEmailSignup}>
          <h2>Create your account</h2>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Secured password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <select
            value={room}
            onChange={(e) => setRoom(e.target.value as 'office' | 'conference')}
          >
            <option value="office">Main Office</option>
            <option value="conference">Conference Room</option>
          </select>

          {error && <div className="error-message">{error}</div>}

          <div className="signup-footer-actions">
            <button type="button" className="btn-secondary" onClick={onBack}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Processing...' : 'Continue'}
            </button>
          </div>
          <p className="auth-toggle">
            Already have an account?
            <span onClick={onGoLogin}> Login</span>
          </p>
        </form>
      </div>
    </div>
  );
}

function LoginPortal({
  onJoin,
  onBack,
  onGoSignup
}: {
  onJoin: (user: User, room: 'office' | 'conference') => void;
  onBack: () => void;
  onGoSignup: () => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [room, setRoom] = useState<'office' | 'conference'>('office');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authService.login(username, password);
      onJoin(res.user, room);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-portal-wrap">
      <div className="signup-portal-card">
        <div className="signup-social-panel">
          <button className="signup-social-btn" onClick={() => authService.startOAuthLogin('microsoft')}>Microsoft</button>
          <button className="signup-social-btn" onClick={() => authService.startOAuthLogin('google')}>Google</button>
          <button className="signup-social-btn" disabled>LinkedIn</button>
          <button className="signup-social-btn" disabled>Github</button>
          <button className="signup-social-btn" disabled>Discord</button>
          <button className="signup-social-btn" disabled>MetaMask</button>
        </div>

        <div className="signup-divider">OR</div>

        <form className="signup-form-panel" onSubmit={handleLogin}>
          <h2>Welcome back</h2>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Secured password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <select
            value={room}
            onChange={(e) => setRoom(e.target.value as 'office' | 'conference')}
          >
            <option value="office">Main Office</option>
            <option value="conference">Conference Room</option>
          </select>

          {error && <div className="error-message">{error}</div>}

          <div className="signup-footer-actions">
            <button type="button" className="btn-secondary" onClick={onBack}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Processing...' : 'Continue'}
            </button>
          </div>
          <p className="auth-toggle">
            New here?
            <span onClick={onGoSignup}> Create account</span>
          </p>
        </form>
      </div>
    </div>
  );
}

// Avatar Selector Component
function AvatarSelector({
  initialProfile,
  onSelect
}: {
  initialProfile: AvatarProfile;
  onSelect: (sprite: string, color: string, profile: AvatarProfile) => void;
}) {
  const [profile, setProfile] = useState<AvatarProfile>(normalizeAvatarProfile(initialProfile));
  const [activeTab, setActiveTab] = useState<keyof AvatarProfile>('body');
  const composed = composeAvatarFromProfile(profile);

  useEffect(() => {
    onSelect(composed.sprite, composed.color, profile);
  }, [profile]);

  const updatePart = (part: keyof AvatarProfile, value: string) => {
    setProfile(prev => ({ ...prev, [part]: value }));
  };

  return (
    <div className="avatar-selector">
      <div className="preview-container">
        <div className="avatar-preview" style={{ backgroundColor: composed.color }}>
          <img src={`/assets/sprites/${composed.sprite}.png`} alt="Avatar Preview" />
        </div>
      </div>

      <div className="avatar-tabs">
        {(Object.keys(AVATAR_CATALOG) as (keyof AvatarProfile)[]).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`avatar-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="selector-group">
        <h4>{activeTab} options</h4>
        <div className="option-grid">
          {AVATAR_CATALOG[activeTab].map((option) => (
            <button
              key={option.id}
              type="button"
              className={`part-option ${profile[activeTab] === option.id ? 'selected' : ''}`}
              onClick={() => updatePart(activeTab, option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Loading Screen Component
function LoadingScreen({ progress }: { progress: number }) {
  return (
    <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-brand-background text-white">
      <div className="mb-8 flex flex-col items-center">
        <div className="h-24 w-24 mb-4 rounded-2xl bg-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/20">
          <span className="text-4xl font-bold">VO</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Virtual Office</h2>
        <p className="text-gray-400 mt-2">Loading workspace assets...</p>
      </div>
      
      <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-brand-primary transition-all duration-300 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className="mt-4 text-sm font-medium text-gray-500">{Math.round(progress * 100)}%</p>
    </div>
  );
}

// Notification System Component
function NotificationSystem({ notifications }: { notifications: string[] }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[3000] flex flex-col gap-2 pointer-events-none">
      {notifications.map((note, i) => (
        <div 
          key={i} 
          className="animate-bounce-in bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full border border-brand-primary/30 text-sm shadow-xl"
        >
          {note}
        </div>
      ))}
    </div>
  );
}

// Game UI Overlay Component
function GameUI({ 
  username, 
  room, 
  onLeave, 
  onChat, 
  chatMessages,
  mediaState,
  onToggleMedia,
  onFullscreenChange,
  activeSpeakerName,
  onOpenAvatarCustomizer
}: { 
  username: string; 
  room: string; 
  onLeave: () => void; 
  onChat: (msg: string) => void;
  chatMessages: { from: string; message: string; isSystem: boolean }[];
  mediaState: { micOn: boolean; cameraOn: boolean; screenShareOn: boolean };
  onToggleMedia: (type: 'mic' | 'camera' | 'screen') => void;
  onFullscreenChange?: (value: boolean) => void;
  activeSpeakerName?: string | null;
  onOpenAvatarCustomizer: () => void;
}) {
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      onChat(chatInput.trim());
      setChatInput('');
    }
  };

  const toggleFullscreen = () => {
    const element = document.getElementById('game-experience');
    if (!element) return;

    if (!document.fullscreenElement) {
      element.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Listen for escape key or other ways fullscreen might exit
  useEffect(() => {
    const handler = () => {
      const inFullscreen = !!document.fullscreenElement;
      setIsFullscreen(inFullscreen);
      onFullscreenChange?.(inFullscreen);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [onFullscreenChange]);

  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex flex-col p-4">
      {/* Top Left: Room Info */}
      <div className="flex flex-col gap-2 items-start pointer-events-auto">
        <div className="bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold flex items-center gap-2 shadow-xl">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          {room.toUpperCase()}
        </div>
        {activeSpeakerName && (
          <div className="bg-black/70 backdrop-blur-md text-white px-3 py-1.5 rounded-lg border border-white/10 text-xs font-semibold flex items-center gap-2 shadow-xl">
            <span>🎙️</span>
            <span>{activeSpeakerName} is speaking</span>
          </div>
        )}
      </div>

      {/* Right side: Chat Sidebar */}
      <div className="absolute right-4 top-4 bottom-24 flex flex-col pointer-events-none">
        <div className={`w-80 flex flex-col bg-black/70 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden pointer-events-auto transition-all duration-300 shadow-2xl h-full ${isChatOpen ? 'translate-x-0 opacity-100' : 'translate-x-[calc(100%+20px)] opacity-0'}`}>
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <span className="text-white font-bold tracking-wider">MESSAGES</span>
            <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-white">✕</button>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.isSystem ? 'items-center' : (msg.from === username ? 'items-end' : 'items-start')}`}>
                {!msg.isSystem && (
                  <span className="text-[10px] text-gray-400 mb-1 px-1">{msg.from}</span>
                )}
                <div className={`px-3 py-2 rounded-xl text-sm max-w-[90%] break-words ${
                  msg.isSystem ? 'bg-transparent text-brand-secondary italic text-xs' : 
                  (msg.from === username ? 'bg-brand-primary text-white shadow-lg' : 'bg-white/10 text-white')
                }`}>
                  {msg.message}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          
          <form onSubmit={handleChatSubmit} className="p-4 bg-black/20 border-t border-white/10">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-brand-primary transition-all shadow-inner"
              maxLength={100}
            />
          </form>
        </div>
      </div>

      {/* Bottom Toolbar (WorkAdventure Style) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-auto bg-black/40 backdrop-blur-2xl p-2 rounded-2xl border border-white/10 shadow-2xl">
        <button 
          className={`toolbar-btn group ${!mediaState.micOn ? 'bg-red-500/20 border-red-500/50' : ''}`}
          onClick={() => onToggleMedia('mic')}
        >
          <span className="text-xl">{mediaState.micOn ? '🎤' : '🔇'}</span>
          <span className="toolbar-tooltip">{mediaState.micOn ? 'Mute' : 'Unmute'}</span>
        </button>
        <span className={`toolbar-status-badge ${mediaState.micOn ? 'on' : 'off'}`}>
          {mediaState.micOn ? 'Mic Live' : 'Mic Off'}
        </span>
        <button 
          className={`toolbar-btn group ${!mediaState.cameraOn ? 'bg-red-500/20 border-red-500/50' : ''}`}
          onClick={() => onToggleMedia('camera')}
        >
          <span className="text-xl">{mediaState.cameraOn ? '📷' : '🚫'}</span>
          <span className="toolbar-tooltip">{mediaState.cameraOn ? 'Stop Camera' : 'Start Camera'}</span>
        </button>
        <span className={`toolbar-status-badge ${mediaState.cameraOn ? 'on' : 'off'}`}>
          {mediaState.cameraOn ? 'Camera Live' : 'Camera Off'}
        </span>
        <button 
          className={`toolbar-btn group ${mediaState.screenShareOn ? 'bg-green-500/20 border-green-500/50' : ''}`}
          onClick={() => onToggleMedia('screen')}
        >
          <span className="text-xl">🖥️</span>
          <span className="toolbar-tooltip">{mediaState.screenShareOn ? 'Stop Sharing' : 'Share Screen'}</span>
        </button>
        <span className={`toolbar-status-badge ${mediaState.screenShareOn ? 'on' : 'off'}`}>
          {mediaState.screenShareOn ? 'Sharing' : 'Not Sharing'}
        </span>
        <div className="w-[1px] h-8 bg-white/10 mx-1" />
        <button 
          className={`toolbar-btn group ${isChatOpen ? 'bg-brand-primary/20 text-brand-primary border-brand-primary/30' : ''}`}
          onClick={() => setIsChatOpen(!isChatOpen)}
        >
          <span className="text-xl">💬</span>
          <span className="toolbar-tooltip">Chat</span>
        </button>
        <button 
          className={`toolbar-btn group ${isFullscreen ? 'bg-brand-primary/20 text-brand-primary border-brand-primary/30' : ''}`}
          onClick={toggleFullscreen}
        >
          <span className="text-xl">{isFullscreen ? '↙️' : '⛶'}</span>
          <span className="toolbar-tooltip">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
        </button>
        <button className="toolbar-btn group" onClick={onOpenAvatarCustomizer}>
          <span className="text-xl">⚙️</span>
          <span className="toolbar-tooltip">Avatar</span>
        </button>
        <div className="w-[1px] h-8 bg-white/10 mx-1" />
        <button 
          className="bg-red-500/80 hover:bg-red-500 text-white w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg group"
          onClick={onLeave}
        >
          <span className="text-xl">🚪</span>
          <span className="toolbar-tooltip">Leave</span>
        </button>
      </div>
    </div>
  );
}

// Main App Component
function App() {
  const [joined, setJoined] = useState(false);
  const [user, setUser] = useState<User | null>(authService.getUser());
  const [entryScreen, setEntryScreen] = useState<'landing' | 'auth' | 'signupPortal' | 'loginPortal'>('landing');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [room, setRoom] = useState<'office' | 'conference'>('office');
  const [chatMessages, setChatMessages] = useState<{ from: string; message: string; isSystem: boolean }[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Video call state
  const [videoCallActive, setVideoCallActive] = useState(false);
  const [nearbyParticipants, setNearbyParticipants] = useState<{ id: string; username: string; distance: number }[]>([]);
  const [privateVideoRoomUrl, setPrivateVideoRoomUrl] = useState<string | undefined>(undefined);
  
  // Media State
  const [mediaState, setMediaState] = useState({
    micOn: false,
    cameraOn: true,
    screenShareOn: false
  });
  
  // Check if server is available
  const [serverAvailable, setServerAvailable] = useState(false);
  const [oauthError, setOauthError] = useState<string>('');
  const [isGameFullscreen, setIsGameFullscreen] = useState(false);
  const [activeSpeakerName, setActiveSpeakerName] = useState<string | null>(null);
  const [showInGameAvatarCustomizer, setShowInGameAvatarCustomizer] = useState(false);
  const [inGameAvatarProfile, setInGameAvatarProfile] = useState<AvatarProfile>(normalizeAvatarProfile(user?.avatar_profile));
  const [savingInGameAvatar, setSavingInGameAvatar] = useState(false);

  useEffect(() => {
    // Check if backend server is available
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/health`)
      .then(() => setServerAvailable(true))
      .catch(() => setServerAvailable(false));
  }, []);

  const addNotification = (message: string) => {
    setNotifications(prev => [...prev, message]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n !== message));
    }, 3000);
  };

  const handleJoin = (userData: User, selectedRoom: 'office' | 'conference') => {
    setUser(userData);
    setRoom(selectedRoom);
    setJoined(true);
    setIsLoading(true);
    setLoadingProgress(0);
    setChatMessages([
      { from: 'System', message: `Welcome to the ${selectedRoom}!`, isSystem: true }
    ]);
    addNotification(`Joining ${selectedRoom}...`);

    // Fallback: If loading takes too long, force clear it after 15 seconds
    setTimeout(() => {
      setIsLoading(prev => {
        if (prev) {
          console.warn('🕒 Loading took too long, forcing start...');
          return false;
        }
        return prev;
      });
    }, 15000);
  };

  const createGuestUser = (): User => {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const sprites = ['worker-yellow', 'worker-blue', 'worker-green', 'worker-red', 'worker-blonde-hero'];
    const randomSprite = sprites[Math.floor(Math.random() * sprites.length)];
    return {
      id: `guest-${Date.now()}`,
      username: `Guest-${randomId}`,
      avatar_sprite: randomSprite,
      avatar_color: '#ffffff',
      avatar_profile: normalizeAvatarProfile({
        body:
          randomSprite === 'worker-blue'
            ? 'human-medium'
            : randomSprite === 'worker-red'
            ? 'human-dark'
            : randomSprite === 'worker-green'
            ? 'fantasy-green'
            : randomSprite === 'worker-blonde-hero'
            ? 'blonde-hero'
            : 'human-light'
      }),
      avatar_customized: 1
    };
  };

  const handleTryFree = () => {
    const guestUser = createGuestUser();
    handleJoin(guestUser, 'office');
  };

  const handleContinueSaved = () => {
    if (user) {
      handleJoin(user, room);
    }
  };

  const handleLeave = () => {
    setJoined(false);
    setVideoCallActive(false);
    setPrivateVideoRoomUrl(undefined);
    setIsLoading(false);
    setActiveSpeakerName(null);
    // Reset media state
    setMediaState({ micOn: false, cameraOn: true, screenShareOn: false });
    setShowInGameAvatarCustomizer(false);
  };

  const openInGameAvatarCustomizer = () => {
    if (!user) return;
    setInGameAvatarProfile(normalizeAvatarProfile(user.avatar_profile));
    setShowInGameAvatarCustomizer(true);
  };

  const saveInGameAvatarCustomizer = async () => {
    if (!user) return;
    setSavingInGameAvatar(true);
    const composed = composeAvatarFromProfile(inGameAvatarProfile);
    const updatedUser: User = {
      ...user,
      avatar_sprite: composed.sprite,
      avatar_color: composed.color,
      avatar_profile: inGameAvatarProfile,
      avatar_customized: 1
    };

    try {
      if (authService.getToken()) {
        await authService.updateAvatar(composed.sprite, composed.color, inGameAvatarProfile);
        const saved = authService.getUser();
        if (saved) {
          setUser(saved);
        } else {
          setUser(updatedUser);
        }
      } else {
        setUser(updatedUser);
      }
      addNotification('Avatar updated');
      setShowInGameAvatarCustomizer(false);
    } catch {
      addNotification('Failed to update avatar');
    } finally {
      setSavingInGameAvatar(false);
    }
  };

  const handleChat = (message: string) => {
    setChatMessages(prev => [...prev, { from: user?.username || 'Unknown', message, isSystem: false }]);
  };

  const handleToggleMedia = (type: 'mic' | 'camera' | 'screen') => {
    setMediaState(prev => {
      const newState = { ...prev };
      if (type === 'mic') newState.micOn = !prev.micOn;
      if (type === 'camera') newState.cameraOn = !prev.cameraOn;
      if (type === 'screen') newState.screenShareOn = !prev.screenShareOn;
      
      addNotification(`${type === 'mic' ? 'Microphone' : type === 'camera' ? 'Camera' : 'Screen Share'} ${newState[type === 'mic' ? 'micOn' : type === 'camera' ? 'cameraOn' : 'screenShareOn'] ? 'Enabled' : 'Disabled'}`);
      
      return newState;
    });
  };

  // Handle proximity video call events
  const handleProximityUpdate = (participants: { id: string; username: string; distance: number }[]) => {
    setNearbyParticipants(participants);
    // Do NOT automatically start video call, just update participants for ProximityUI
  };

  const handleLoadingProgress = (progress: number) => {
    setLoadingProgress(progress);
    if (progress >= 1) {
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  const closeVideoCall = () => {
    setVideoCallActive(false);
    setPrivateVideoRoomUrl(undefined);
  };

  const handleStartVideoCall = (url: string) => {
    setPrivateVideoRoomUrl(url);
    setVideoCallActive(true);
  };

  useEffect(() => {
    const oauthMessage = new URLSearchParams(window.location.search).get('message');
    if (oauthMessage) {
      setOauthError(`OAuth login failed: ${oauthMessage.replaceAll('_', ' ')}`);
    }

    authService.consumeOAuthCallback()
      .then((oauthUser) => {
        if (oauthUser) {
          handleJoin(oauthUser, 'office');
        }
      })
      .catch(() => {
        setOauthError('OAuth login failed. Please try again.');
      });
  }, []);

  return (
    <div className="App">
      {isLoading && <LoadingScreen progress={loadingProgress} />}
      <NotificationSystem notifications={notifications} />

      <main className={`app-main ${joined ? 'app-main-game' : ''}`}>
        {!serverAvailable && (
          <div className="server-status warning">
            ⚠️ Backend server not running. Features unavailable.
          </div>
        )}
        {oauthError && <div className="server-status warning">{oauthError}</div>}
        {!joined ? (
          entryScreen === 'landing' ? (
            <LandingPage
              onTryFree={handleTryFree}
              onLogin={() => {
                setEntryScreen('loginPortal');
              }}
              onRegister={() => {
                setEntryScreen('signupPortal');
              }}
              savedUser={user}
              onContinueSaved={handleContinueSaved}
            />
          ) : entryScreen === 'signupPortal' ? (
            <SignupPortal
              onJoin={handleJoin}
              onBack={() => setEntryScreen('landing')}
              onGoLogin={() => {
                setEntryScreen('loginPortal');
              }}
            />
          ) : entryScreen === 'loginPortal' ? (
            <LoginPortal
              onJoin={handleJoin}
              onBack={() => setEntryScreen('landing')}
              onGoSignup={() => setEntryScreen('signupPortal')}
            />
          ) : (
            <AuthModal
              onJoin={handleJoin}
              initialMode={authMode}
              onBack={() => setEntryScreen('landing')}
            />
          )
        ) : (
          <div id="game-experience" className="game-wrapper">
            <div className="game-container-wrapper">
              <GameCanvas
                user={user!}
                room={room}
                micOn={mediaState.micOn}
                onProximityUpdate={handleProximityUpdate}
                onMicSpeakerUpdate={(data) => {
                  setActiveSpeakerName(data.isActive ? data.speakerUsername : null);
                }}
                onLoadingProgress={handleLoadingProgress}
              />
            </div>
            <GameUI 
              username={user!.username} 
              room={room} 
              onLeave={handleLeave} 
              onChat={handleChat} 
              chatMessages={chatMessages}
              mediaState={mediaState}
              onToggleMedia={handleToggleMedia}
              onFullscreenChange={setIsGameFullscreen}
              activeSpeakerName={activeSpeakerName}
              onOpenAvatarCustomizer={openInGameAvatarCustomizer}
            />
            {showInGameAvatarCustomizer && (
              <div className="modal-overlay">
                <div className="modal-content avatar-modal">
                  <h2>Customize Avatar</h2>
                  <AvatarSelector
                    initialProfile={inGameAvatarProfile}
                    onSelect={(_sprite, _color, profile) => setInGameAvatarProfile(profile)}
                  />
                  <div className="modal-footer">
                    <button
                      className="btn-secondary"
                      onClick={() => setShowInGameAvatarCustomizer(false)}
                      disabled={savingInGameAvatar}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-primary"
                      onClick={saveInGameAvatarCustomizer}
                      disabled={savingInGameAvatar}
                    >
                      {savingInGameAvatar ? 'Saving...' : 'Save Avatar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {joined && (
              <ProximityUI 
                participants={nearbyParticipants}
                onStartVideoCall={handleStartVideoCall}
                currentUsername={user!.username}
              />
            )}
            <ProximityVideoCall
              active={videoCallActive || mediaState.micOn || mediaState.cameraOn || mediaState.screenShareOn}
              participants={nearbyParticipants}
              onClose={closeVideoCall}
              micOn={mediaState.micOn}
              cameraOn={mediaState.cameraOn}
              screenShareOn={mediaState.screenShareOn}
              isNearOthers={videoCallActive}
              roomUrl={privateVideoRoomUrl}
            />
          </div>
        )}
      </main>

      <style>{`
        /* Original App Styles */
        .App {
          text-align: center;
          background-color: #1a1a1a;
          min-height: 100vh;
          color: white;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow-x: hidden;
        }

        .app-header {
          padding: 40px 20px;
          background: linear-gradient(180deg, rgba(102, 126, 234, 0.1) 0%, rgba(0, 0, 0, 0) 100%);
        }

        .app-header h1 {
          margin: 0;
          font-size: 3rem;
          font-weight: 800;
          letter-spacing: -1px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .app-header p {
          color: #999;
          margin-top: 10px;
          font-size: 1.1rem;
        }

        .app-main {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          flex: 1;
          width: 100%;
        }
        .app-main-game {
          padding: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
        }

        /* Original Auth & Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          backdrop-filter: blur(8px);
        }

        .modal-content {
          background: #2d2d2d;
          padding: 40px;
          border-radius: 24px;
          width: 90%;
          max-width: 480px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(102, 126, 234, 0.3);
          position: relative;
          overflow: hidden;
        }

        .modal-content h2 {
          margin-bottom: 30px;
          color: #fff;
          font-size: 1.8rem;
          font-weight: 700;
          text-align: center;
        }

        .form-group {
          margin-bottom: 24px;
          text-align: left;
        }

        .form-group label {
          display: block;
          margin-bottom: 10px;
          font-weight: 600;
          color: #aaa;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #444;
          border-radius: 12px;
          background: #1a1a1a;
          color: #fff;
          font-size: 1rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-sizing: border-box;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #667eea;
          background: #222;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .btn-primary {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.2);
          margin-top: 10px;
        }
        .btn-secondary {
          width: 100%;
          padding: 14px 16px;
          background: transparent;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.35);
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 12px;
        }
        .btn-secondary:hover {
          border-color: #667eea;
          color: #cbd5ff;
        }
        .social-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          margin-top: 12px;
        }
        .btn-social {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid #444;
          background: #242424;
          color: #e6e6e6;
          font-size: 0.9rem;
          cursor: pointer;
        }
        .btn-social:hover {
          border-color: #667eea;
          background: #2f2f2f;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(102, 126, 234, 0.4);
          filter: brightness(1.1);
        }

        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #555;
        }

        .auth-toggle {
          margin-top: 24px;
          text-align: center;
          font-size: 1rem;
          color: #888;
        }

        .auth-toggle span {
          color: #667eea;
          cursor: pointer;
          font-weight: 700;
          margin-left: 5px;
          text-decoration: underline;
          text-underline-offset: 4px;
        }

        .error-message {
          color: #ff4d4d;
          background: rgba(255, 77, 77, 0.1);
          padding: 14px;
          border-radius: 12px;
          margin-bottom: 24px;
          font-size: 0.95rem;
          border-left: 4px solid #ff4d4d;
        }

        /* Avatar Selector Styles */
        .avatar-modal {
          max-width: 600px;
        }
        .avatar-selector {
          display: flex;
          flex-direction: column;
          gap: 30px;
          align-items: center;
        }
        .preview-container {
          padding: 30px;
          background: #1a1a1a;
          border-radius: 20px;
          border: 1px solid #444;
          box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
        }
        .avatar-preview {
          width: 100px;
          height: 100px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          transition: all 0.3s;
        }
        .avatar-preview img {
          width: 100%;
          height: 100%;
          image-rendering: pixelated;
        }
        .selector-group {
          width: 100%;
        }
        .selector-group h4 {
          margin-bottom: 16px;
          color: #888;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 2px;
          text-align: left;
        }
        .avatar-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          width: 100%;
          justify-content: center;
        }
        .avatar-tab {
          border: 1px solid #4b4b61;
          background: #262b46;
          color: #c6cae8;
          border-radius: 999px;
          padding: 6px 10px;
          text-transform: capitalize;
          cursor: pointer;
          font-size: 0.78rem;
        }
        .avatar-tab.active {
          background: #5b39d8;
          border-color: #7b5cff;
          color: #ffffff;
        }
        .option-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 10px;
        }
        .part-option {
          border: 1px solid #43455b;
          background: #2c2f45;
          color: #d6d8e9;
          border-radius: 10px;
          padding: 8px 10px;
          text-align: center;
          cursor: pointer;
          font-size: 0.82rem;
        }
        .part-option.selected {
          border-color: #667eea;
          background: #3b4168;
          color: #ffffff;
        }
        .sprite-options, .color-options {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .sprite-option {
          width: 56px;
          height: 56px;
          background: #333;
          border: 3px solid transparent;
          border-radius: 14px;
          cursor: pointer;
          padding: 6px;
          transition: all 0.2s;
        }
        .sprite-option.selected {
          border-color: #667eea;
          background: #444;
          transform: scale(1.1);
        }
        .sprite-option img {
          width: 100%;
          height: 100%;
          image-rendering: pixelated;
        }
        .color-option {
          width: 36px;
          height: 36px;
          border: 3px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .color-option.selected {
          border-color: #fff;
          transform: scale(1.2) rotate(45deg);
          border-radius: 8px;
        }
        .modal-footer {
          margin-top: 30px;
          width: 100%;
        }

        /* Game styles */
        .game-wrapper {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100vw;
          height: 100vh;
          max-width: none;
          margin: 0 auto;
        }

        .game-container-wrapper {
          border: none;
          border-radius: 0;
          overflow: hidden;
          box-shadow: none;
          background: #000;
          width: 100vw;
          height: 100vh;
          max-width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 0 auto;
        }
        .game-container {
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
        }
        .game-container canvas {
          display: block;
        }

        #game-experience:fullscreen {
          width: 100vw;
          height: 100vh;
          max-width: none;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        #game-experience:fullscreen .game-container-wrapper {
          max-width: 100%;
          max-height: 100%;
          height: 100%;
        }

        /* Chat Scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        @keyframes bounce-in {
          0% { transform: translate(-50%, -20px) scale(0.9); opacity: 0; }
          70% { transform: translate(-50%, 5px) scale(1.05); }
          100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        /* Toolbar Styles */
        .toolbar-btn {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          cursor: pointer;
        }

        .toolbar-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        .toolbar-btn:active {
          transform: translateY(0) scale(0.95);
        }
        .toolbar-status-badge {
          font-size: 11px;
          line-height: 1;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          color: #d1d5db;
          background: rgba(0, 0, 0, 0.35);
          min-width: 86px;
          text-align: center;
        }
        .toolbar-status-badge.on {
          color: #86efac;
          border-color: rgba(34, 197, 94, 0.4);
          background: rgba(22, 101, 52, 0.28);
        }
        .toolbar-status-badge.off {
          color: #fca5a5;
          border-color: rgba(239, 68, 68, 0.35);
          background: rgba(127, 29, 29, 0.25);
        }

        .toolbar-tooltip {
          position: absolute;
          bottom: calc(100% + 12px);
          left: 50%;
          transform: translateX(-50%) translateY(10px);
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
          color: white;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: all 0.2s;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .group:hover .toolbar-tooltip {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        .server-status {
          margin-top: 15px;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 0.9rem;
          text-align: center;
          display: inline-block;
        }

        .server-status.warning {
          background: rgba(239, 68, 68, 0.1);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }

        .landing-page {
          width: min(1200px, 95vw);
          background: #f3f4f8;
          border-radius: 18px;
          color: #23253a;
          overflow: hidden;
        }
        .landing-nav {
          margin: 16px;
          border-radius: 12px;
          background: #444a66;
          color: white;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .brand {
          font-size: 1.8rem;
          font-weight: 700;
          letter-spacing: 0.3px;
        }
        .nav-actions {
          display: flex;
          gap: 10px;
        }
        .landing-center-links {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .nav-link-btn {
          border: none;
          background: transparent;
          color: #e4e7f5;
          font-size: 0.95rem;
          cursor: pointer;
          padding: 8px 10px;
          border-radius: 8px;
        }
        .nav-link-btn:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .resources-menu-wrap {
          position: relative;
        }
        .resources-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          min-width: 170px;
          background: #3f4662;
          border: 1px solid rgba(172, 182, 230, 0.25);
          border-radius: 10px;
          padding: 6px;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
          z-index: 20;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .resources-item {
          border: none;
          background: transparent;
          color: #e7ebff;
          text-align: left;
          padding: 8px 10px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
        }
        .resources-item:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .nav-btn {
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: transparent;
          color: white;
          border-radius: 8px;
          padding: 10px 14px;
          cursor: pointer;
        }
        .nav-btn.nav-primary {
          background: #7624ff;
          border-color: #7624ff;
        }
        .products-overlay {
          margin: -4px 16px 0;
          background: rgba(31, 36, 66, 0.96);
          border: 1px solid rgba(151, 160, 211, 0.28);
          border-radius: 14px;
          padding: 18px;
          display: grid;
          grid-template-columns: repeat(4, minmax(180px, 1fr));
          gap: 16px;
          text-align: left;
          color: #e7ebff;
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.35);
        }
        .products-column h3 {
          margin: 0 0 8px 0;
          color: #aeb6df;
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .products-column h4 {
          margin: 0 0 8px 0;
          font-size: 1.25rem;
          line-height: 1.1;
          color: #ffffff;
        }
        .products-column ul {
          margin: 0;
          padding-left: 18px;
          color: #d2d9ff;
          font-size: 0.9rem;
          line-height: 1.5;
        }
        .overlay-link {
          border: none;
          background: transparent;
          color: #d2d9ff;
          padding: 0;
          font: inherit;
          text-align: left;
          cursor: pointer;
        }
        .overlay-link:hover {
          color: #ffffff;
          text-decoration: underline;
        }
        .hero-section {
          padding: 30px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .hero-copy {
          text-align: left;
        }
        .hero-copy h1 {
          margin: 6px 0 14px 0;
          color: #1d2140;
          font-size: clamp(2rem, 4vw, 3.1rem);
          line-height: 1;
          max-width: 520px;
        }
        .hero-tag {
          color: #676f8c;
          font-size: 0.85rem;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }
        .hero-actions {
          width: min(380px, 100%);
          margin-top: 16px;
        }
        .try-free-btn {
          background: #6d20ff;
          box-shadow: none;
        }
        .trial-note {
          margin-top: 10px;
          color: #586080;
          font-size: 0.9rem;
        }
        .hero-video-card {
          background: linear-gradient(180deg, #2a2f49, #181b2b);
          border-radius: 18px;
          min-height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #d3d7ef;
          font-size: 1.1rem;
          border: 1px solid rgba(255, 255, 255, 0.18);
        }
        .how-section {
          border-top: 1px solid #e2e5f0;
          padding: 24px 30px 38px;
          text-align: center;
        }
        .how-section h2 {
          font-size: 2.2rem;
          color: #1f2442;
          margin: 0 0 8px 0;
        }
        .services-section {
          border-top: 1px solid #e2e5f0;
          padding: 24px 30px 34px;
          text-align: left;
        }
        .services-section h2 {
          margin: 0 0 14px 0;
          color: #1f2442;
        }
        .info-section {
          border-top: 1px solid #e2e5f0;
          padding: 24px 30px 34px;
          text-align: left;
          background: #f8f9fd;
        }
        .info-section h2 {
          margin: 0 0 8px 0;
          color: #1f2442;
        }
        .info-section p {
          margin: 0;
          color: #4b5375;
          line-height: 1.5;
          max-width: 780px;
        }
        .info-section-sub {
          background: #f5f7fd;
        }
        .services-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(240px, 1fr));
          gap: 14px;
        }
        .service-card {
          background: #ffffff;
          border: 1px solid #dce1f1;
          border-radius: 12px;
          padding: 16px;
          scroll-margin-top: 20px;
        }
        .service-card.active {
          border-color: #7624ff;
          box-shadow: 0 0 0 2px rgba(118, 36, 255, 0.12);
        }
        .service-card h3 {
          margin: 0 0 8px 0;
          color: #1f2442;
        }
        .service-card p {
          margin: 0 0 10px 0;
          color: #4b5375;
          line-height: 1.45;
        }
        .service-more-btn {
          margin-top: 12px;
          border: 1px solid #c5cef5;
          background: #f5f7ff;
          color: #25316c;
          border-radius: 8px;
          padding: 8px 10px;
          cursor: pointer;
        }
        .service-more-btn:hover {
          background: #ebefff;
        }
        .service-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 600;
        }
        .service-badge.live {
          background: #dcfce7;
          color: #166534;
        }
        .service-badge.soon {
          background: #fef3c7;
          color: #92400e;
        }
        .service-badge.roadmap {
          background: #e0e7ff;
          color: #3730a3;
        }
        .service-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 2200;
          background: rgba(10, 14, 35, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .service-modal {
          width: min(820px, 95vw);
          max-height: 90vh;
          overflow: auto;
          background: #f9faff;
          color: #1c2347;
          border-radius: 14px;
          border: 1px solid #d6dcfb;
          padding: 20px;
          text-align: left;
          position: relative;
        }
        .service-modal-close {
          position: absolute;
          right: 14px;
          top: 12px;
          border: none;
          background: transparent;
          font-size: 1.1rem;
          cursor: pointer;
          color: #4b5375;
        }
        .service-modal h3 {
          margin: 0 0 4px 0;
          font-size: 1.8rem;
        }
        .service-modal-status {
          margin: 0 0 10px 0;
          color: #5b3df5;
          font-weight: 600;
        }
        .service-modal-intro {
          margin: 0 0 12px 0;
          color: #3f4971;
          line-height: 1.45;
        }
        .service-modal-columns {
          display: grid;
          grid-template-columns: repeat(2, minmax(220px, 1fr));
          gap: 14px;
        }
        .service-modal-columns h4 {
          margin: 0 0 8px 0;
        }
        .service-modal-columns ul {
          margin: 0;
          padding-left: 18px;
          color: #3f4971;
          line-height: 1.45;
        }
        .trusted-section {
          background: #f0f1f5;
          border-top: 1px solid #e2e5f0;
          border-radius: 0 0 18px 18px;
          overflow: hidden;
          padding: 16px 0;
        }
        .trusted-track {
          display: flex;
          width: max-content;
          animation: trusted-scroll 28s linear infinite;
        }
        .trusted-logo {
          flex: 0 0 auto;
          min-width: 170px;
          text-align: center;
          color: #7d8196;
          padding: 8px 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 64px;
        }
        .trusted-logo img {
          max-height: 34px;
          max-width: 150px;
          width: auto;
          filter: grayscale(1);
          opacity: 0.9;
        }
        .trusted-logo-fallback {
          display: none;
          font-size: 1.3rem;
          font-weight: 700;
          letter-spacing: 0.2px;
          color: #7d8196;
        }
        @keyframes trusted-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .signup-portal-wrap {
          width: min(1200px, 96vw);
          background: rgba(20, 27, 56, 0.75);
          border-radius: 16px;
          border: 1px solid rgba(138, 149, 200, 0.35);
          backdrop-filter: blur(8px);
          overflow: hidden;
        }
        .signup-portal-card {
          display: grid;
          grid-template-columns: minmax(240px, 380px) 60px minmax(280px, 1fr);
          align-items: stretch;
          min-height: 480px;
          padding: 24px;
          gap: 12px;
        }
        .signup-social-panel {
          display: flex;
          flex-direction: column;
          gap: 10px;
          justify-content: center;
        }
        .signup-social-btn {
          border: 1px solid rgba(214, 223, 255, 0.6);
          background: linear-gradient(90deg, rgba(53, 68, 112, 0.5), rgba(25, 39, 81, 0.35));
          color: #ecf0ff;
          border-radius: 12px;
          padding: 13px 16px;
          font-size: 1.1rem;
          text-align: left;
          cursor: pointer;
        }
        .signup-social-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .signup-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a9b4df;
          font-size: 0.85rem;
          position: relative;
        }
        .signup-divider::before,
        .signup-divider::after {
          content: '';
          position: absolute;
          left: 50%;
          width: 1px;
          background: rgba(183, 193, 242, 0.4);
        }
        .signup-divider::before {
          top: 0;
          height: calc(50% - 20px);
        }
        .signup-divider::after {
          bottom: 0;
          height: calc(50% - 20px);
        }
        .signup-form-panel {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 10px;
          text-align: left;
        }
        .signup-form-panel h2 {
          margin: 0 0 8px 0;
        }
        .signup-form-panel input,
        .signup-form-panel select {
          width: 100%;
          padding: 14px 16px;
          border: 1px solid rgba(162, 176, 231, 0.45);
          border-radius: 12px;
          background: rgba(33, 46, 91, 0.55);
          color: #f4f6ff;
          font-size: 1rem;
        }
        .signup-form-panel input::placeholder {
          color: #aeb8df;
        }
        .signup-footer-actions {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 10px;
          margin-top: 6px;
        }
        .signup-footer-actions .btn-primary,
        .signup-footer-actions .btn-secondary {
          margin-top: 0;
        }

        @media (max-width: 900px) {
          .products-overlay {
            grid-template-columns: 1fr;
          }
          .hero-section {
            grid-template-columns: 1fr;
          }
          .services-grid {
            grid-template-columns: 1fr;
          }
          .service-modal-columns {
            grid-template-columns: 1fr;
          }
          .signup-portal-card {
            grid-template-columns: 1fr;
          }
          .signup-divider {
            min-height: 30px;
          }
          .signup-divider::before,
          .signup-divider::after {
            display: none;
          }
        }

        .video-call-overlay {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.9);
          border-radius: 16px;
          padding: 20px;
          z-index: 2000;
          border: 2px solid #667eea;
          backdrop-filter: blur(10px);
          min-width: 400px;
          max-width: 90%;
        }

        .video-call-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #444;
        }

        .video-call-header h3 {
          color: #10b981;
          font-size: 16px;
          margin: 0;
        }

        .btn-close {
          background: none;
          border: none;
          color: #999;
          font-size: 20px;
          cursor: pointer;
        }

        .video-grid {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .video-participant {
          position: relative;
          width: 80px;
          height: 80px;
          background: #333;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .video-participant.local {
          border: 2px solid #667eea;
        }

        .video-participant.remote {
          border: 2px solid #333;
        }

        .participant-avatar {
          width: 40px;
          height: 40px;
          background: #667eea;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 18px;
        }

        .participant-name {
          font-size: 11px;
          margin-top: 4px;
          color: #ccc;
        }

        .video-status {
          position: absolute;
          bottom: 4px;
          right: 4px;
          font-size: 10px;
          color: #10b981;
        }

        .video-status.local-status {
          position: absolute;
          bottom: 4px;
          right: 4px;
          font-size: 10px;
          color: #ef4444;
        }

        .distance-badge {
          background: #10b981;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
        }

        .camera-preview {
          width: 100%;
          height: 100%;
          background: #333;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .camera-preview.camera-off {
          background: #111;
        }

        .camera-off-icon {
          font-size: 30px;
          color: #555;
        }

        .preview-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        .preview-avatar {
          font-size: 24px;
          font-weight: bold;
          color: #667eea;
        }

        .remote-camera {
          width: 100%;
          height: 100%;
          background: #444;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .video-controls {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .control-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          background: #444;
          color: #fff;
          cursor: pointer;
          font-size: 18px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .control-btn:hover {
          background: #667eea;
        }

        .control-btn.active {
          background: #10b981;
        }

        .control-btn.mute:hover {
          background: #f59e0b;
        }

        .control-btn.camera:hover {
          background: #3b82f6;
        }

        .control-btn.screen:hover {
          background: #8b5cf6;
        }

        .control-btn.leave:hover {
          background: #ef4444;
        }

        @media (max-width: 768px) {
          .game-ui-overlay {
            top: 10px;
            left: 10px;
            right: 10px;
            bottom: 10px;
          }

          .chat-sidebar {
            width: 200px;
            top: 60px;
            right: 10px;
          }

          .minimap {
            width: 100px;
            height: 100px;
          }

          .video-call-overlay {
            width: 90%;
            min-width: auto;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
