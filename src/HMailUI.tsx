import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, Edit3, Save, Send, LogOut, ArrowLeft, Trash2, Key, User, Code, Wifi,
  Star, Search, Archive, AlertOctagon, HelpCircle, Settings,
  Volume2, VolumeX, Plus, RefreshCw, Bookmark, Shield, CheckSquare, X,
  Square, Check, Inbox, Download, CornerUpLeft, Forward, AlertTriangle,
  ChevronDown, Layers, Lock, Eye, EyeOff, Sparkles, FileText, Ban, Trash, Globe,
  Clock, Tag, Sliders, Wand2, ShieldCheck, Activity, Terminal, Paperclip
} from 'lucide-react';
import { db } from './lib/firebase';
import { doc, getDoc, getDocs, setDoc, collection, query, where, onSnapshot, addDoc, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import { PrivacyFooter } from './App';

const reactCodeSnippet = `import React, { useState } from 'react';
import CryptoJS from 'crypto-js';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// 1. Copy our exact Hmail Database Config
const firebaseConfig = {
  apiKey: "AIzaSyAg8H1IQl3mMXHFDpqXySWo1GzkU5yhJj0",
  authDomain: "opportune-helix-bcf5x.firebaseapp.com",
  projectId: "opportune-helix-bcf5x",
  storageBucket: "opportune-helix-bcf5x.firebasestorage.app",
  messagingSenderId: "1010756121584",
  appId: "1:1010756121584:web:cb8644093b10d11b872335"
};

// Initialize connection
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 2. High-performance Login Function with Blacklist Checks
export async function loginWithHmail(username, password) {
  // Clear trim + resolve full email address matching standard
  let email = username.trim().toLowerCase();
  if (!email.includes('@')) {
    email = \`\${email}@hmail.com\`;
  }

  // Double check if account has been banned on the Hmail infrastructure
  const banRef = collection(db, 'banned_emails');
  const banQuery = query(banRef, where('email', '==', email));
  const banSnap = await getDocs(banQuery);

  if (!banSnap.empty) {
    throw new Error("Authentication failed: This Hmail account has been banned and cannot sign in.");
  }

  // Double check user index exists in hmail_users database
  const userRef = doc(db, 'hmail_users', email);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error("Hmail profile not found in directory.");
  }

  // Hash user password input to verify matching SHA256 integrity
  const pwHash = CryptoJS.SHA256(password.trim()).toString();
  const userData = userSnap.data();

  if (userData.passwordHash !== pwHash) {
    throw new Error("Password invalid.");
  }

  // Sign in against main secure auth instance
  const authCred = await signInWithEmailAndPassword(auth, email, password);
  return {
    uid: authCred.user.uid,
    username: userData.username,
    isITAdmin: !!userData.isITAdmin
  };
}`;

const vanillaJsCodeSnippet = `<!-- Import Firebase SDKs & CryptoJS -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script>
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
  import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
  import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

  const firebaseConfig = {
    apiKey: "AIzaSyAg8H1IQl3mMXHFDpqXySWo1GzkU5yhJj0",
    authDomain: "opportune-helix-bcf5x.firebaseapp.com",
    projectId: "opportune-helix-bcf5x",
    storageBucket: "opportune-helix-bcf5x.firebasestorage.app"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  async function loginHmail(user, pass) {
    let email = user.trim().toLowerCase();
    if (!email.includes('@')) email += '@hmail.com';

    // Verify if this Hmail account has been registered on the blacklist database
    const banRef = collection(db, 'banned_emails');
    const banQuery = query(banRef, where('email', '==', email));
    const banSnap = await getDocs(banQuery);

    if (!banSnap.empty) {
      alert("Authentication Failed: This Hmail account is banned on the network.");
      return;
    }

    const pwHash = CryptoJS.SHA256(pass.trim()).toString();

    const docSnap = await getDoc(doc(db, 'hmail_users', email));
    if (!docSnap.exists() || docSnap.data().passwordHash !== pwHash) {
      alert("Invalid Hmail credentials.");
      return;
    }
    await signInWithEmailAndPassword(auth, email, pass);
    alert("Logged in successfully inside companion application!");
  }
</script>`;

const curlCodeSnippet = `# Retrieve specific Hmail User account from Firestore REST API
curl -X GET \
  "https://firestore.googleapis.com/v1/projects/opportune-helix-bcf5x/databases/ai-studio-cc57e9a3-f86d-4fd8-981d-fa170ef7dd16/documents/hmail_users/YOUR_USER%40hmail.com" \
  -H "Accept: application/json"
# Note: Ensure you check the 'banned_emails' collection before rendering success.`;

export function HMailUI({ setActiveAppTab }: { setActiveAppTab: (tab: 'chat' | 'mail') => void }) {
  const [currentUser, setCurrentUser] = useState<{username: string, isITAdmin?: boolean} | null>(() => {
    try {
       const saved = localStorage.getItem('hmail_current_user');
       const lastUsed = localStorage.getItem('hmail_last_used_time');
       if (saved) {
          const parsedUser = JSON.parse(saved);
          if (lastUsed) {
             const parsedTime = parseInt(lastUsed, 10);
             const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
             if (Date.now() - parsedTime > twoWeeksMs) {
                localStorage.removeItem('hmail_current_user');
                localStorage.removeItem('hmail_last_used_time');
                return null;
             }
          }
          localStorage.setItem('hmail_last_used_time', String(Date.now()));
          return parsedUser;
       }
    } catch (e) {
       console.error("Failed to restore H Mail session:", e);
    }
    return null;
  });

  const [mode, setMode] = useState<'login' | 'register' | 'inbox' | 'compose' | 'create_user'>(() => {
    try {
       const saved = localStorage.getItem('hmail_current_user');
       const lastUsed = localStorage.getItem('hmail_last_used_time');
       if (saved && lastUsed) {
          const parsedTime = parseInt(lastUsed, 10);
          const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
          if (Date.now() - parsedTime <= twoWeeksMs) {
             return 'inbox';
          }
       }
    } catch (e) {}
    return 'login';
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [isRegisteringAdmin, setIsRegisteringAdmin] = useState(false);
  const [adminCode, setAdminCode] = useState('');

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [adminDomain, setAdminDomain] = useState('@company.com');
  const [userDomain, setUserDomain] = useState('@hmail.com');
  const [managedUsers, setManagedUsers] = useState<any[]>([]);

  // SSO Tester Panel states
  const [ssoTesterUsername, setSsoTesterUsername] = useState('');
  const [ssoTesterPassword, setSsoTesterPassword] = useState('');
  const [ssoTesterResult, setSsoTesterResult] = useState<{
    success: boolean;
    token?: string;
    message: string;
    profile?: { username: string; isITAdmin: boolean; createdAt: string };
  } | null>(null);
  const [ssoTesterLoading, setSsoTesterLoading] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'react' | 'js' | 'curl'>('react');
  const [copiedText, setCopiedText] = useState(false);
  const [ssoGatewayEnabled, setSsoGatewayEnabled] = useState<boolean>(true);
  const [brotherAppAuthorized, setBrotherAppAuthorized] = useState<boolean>(false);
  const [brotherAppUrl, setBrotherAppUrl] = useState<string>("");
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string>("");
  const [ssoProcessing, setSsoProcessing] = useState<boolean>(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState<boolean>(false);
  const [allAccounts, setAllAccounts] = useState<{username: string, isITAdmin?: boolean}[]>(() => {
     try {
        const savedList = localStorage.getItem('hmail_accounts_list');
        if (savedList) return JSON.parse(savedList);
     } catch (e) {}
     try {
        const saved = localStorage.getItem('hmail_current_user');
        if (saved) return [JSON.parse(saved)];
     } catch (e) {}
     return [];
  });
  
  // Real-time mail states
  const [incomingMsgs, setIncomingMsgs] = useState<any[]>([]);
  const [outgoingMsgs, setOutgoingMsgs] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  
  // Compose Panel states
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composePriority, setComposePriority] = useState<'high' | 'medium' | 'low'>('low');
  const [composingMsg, setComposingMsg] = useState(false);

  // Folder & Search Sidebar settings
  const [activeFolder, setActiveFolder] = useState<'inbox' | 'starred' | 'sent' | 'drafts' | 'archive' | 'spam' | 'trash' | 'scheduled'>('inbox');
  const [activeCategory, setActiveCategory] = useState<'primary' | 'social' | 'updates' | 'forums'>('primary');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Power User Toggles & Prefs (persisted locally)
  const [undoSendDelay, setUndoSendDelay] = useState<number>(() => Number(localStorage.getItem(`hmail_undo_send_${currentUser?.username}`) || '10'));
  const [customAlias, setCustomAlias] = useState<string>(() => localStorage.getItem(`hmail_custom_alias_${currentUser?.username}`) || '');
  const [layoutDensity, setLayoutDensity] = useState<'compact' | 'cozy' | 'spacious'>(() => (localStorage.getItem(`hmail_density_${currentUser?.username}`) as any) || 'cozy');
  const [zenMode, setZenMode] = useState<boolean>(false);
  const [customLabels, setCustomLabels] = useState<{name: string, color: string}[]>(() => {
    try {
      const saved = localStorage.getItem(`hmail_labels_${currentUser?.username}`);
      return saved ? JSON.parse(saved) : [
        { name: "Urgent VIP", color: "#ef4444" },
        { name: "Project Update", color: "#3b82f6" },
        { name: "Finance", color: "#10b981" }
      ];
    } catch(e) {
      return [];
    }
  });

  // Active compose additions (for sending encryption, delays, expiry)
  const [encryptCompose, setEncryptCompose] = useState(false);
  const [selfDestructOption, setSelfDestructOption] = useState<number>(0); // 0 = never, otherwise ms
  const [scheduledDelayOption, setScheduledDelayOption] = useState<number>(0); // 0 = instant, otherwise ms
  const [trackingPixelActive, setTrackingPixelActive] = useState(false);
  const [localToneSelection, setLocalToneSelection] = useState<string>('none');
  const [suggestedToneHelp, setSuggestedToneHelp] = useState<string>('');

  // Undo Send Active Delay states
  const [pendingUndoEmail, setPendingUndoEmail] = useState<any | null>(null);
  const [undoCountdown, setUndoCountdown] = useState<number>(0);
  const [undoIntervalId, setUndoIntervalId] = useState<any>(null);

  // Attachment scanner simulation list
  const [attachmentFiles, setAttachmentFiles] = useState<{name: string, size: string, securityStatus?: 'analyzing' | 'clean' | 'blocked'}[]>([]);
  const [selectedMailDecrypted, setSelectedMailDecrypted] = useState<{[key: string]: boolean}>({});
  
  // Bulk selection and view states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Audio Notifications state
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Helper constants for compose external domain checking
  const mySenderDomain = (currentUser?.username || '').includes('@') 
     ? '@' + (currentUser?.username || '').split('@')[1].toLowerCase() 
     : '@hmail.com';
  const myRecipientDomain = composeTo.trim().includes('@') 
     ? '@' + composeTo.trim().split('@')[1].toLowerCase() 
     : null;
  const isExternalCompose = myRecipientDomain && myRecipientDomain !== mySenderDomain && composeTo.trim().toLowerCase() !== 'hproductnotifications@gmail.com';

  // Custom live user settings (stored locally for responsiveness)
  const [showSettingsTray, setShowSettingsTray] = useState(false);
  const [signatureText, setSignatureText] = useState(() => localStorage.getItem(`hmail_sig_${currentUser?.username}`) || '');
  const [signatureEnabled, setSignatureEnabled] = useState(() => localStorage.getItem(`hmail_sig_enabled_${currentUser?.username}`) !== 'false');
  const [oooEnabled, setOooEnabled] = useState(() => localStorage.getItem(`hmail_ooo_enabled_${currentUser?.username}`) === 'true');
  const [oooText, setOooText] = useState(() => localStorage.getItem(`hmail_ooo_text_${currentUser?.username}`) || 'Hello, I am out of the office and will reply when I return.');
  const [blockedSenders, setBlockedSenders] = useState<string[]>(() => JSON.parse(localStorage.getItem(`hmail_blocked_${currentUser?.username}`) || '[]'));
  const [newBlockedEmail, setNewBlockedEmail] = useState('');

  // Resend Real-world Delivery config variables (stored per user in localStorage)
  const [resendApiKey, setResendApiKey] = useState(() => localStorage.getItem(`hmail_resend_api_key_${currentUser?.username}`) || '');
  const [useOnboardingDomain, setUseOnboardingDomain] = useState(() => localStorage.getItem(`hmail_resend_onboarding_${currentUser?.username}`) !== 'false');
  const [customSenderEmail, setCustomSenderEmail] = useState(() => localStorage.getItem(`hmail_resend_sender_${currentUser?.username}`) || 'onboarding@resend.dev');

  const handleSaveResendSettings = (key: string, useOnboarding: boolean, sender: string) => {
     setResendApiKey(key);
     setUseOnboardingDomain(useOnboarding);
     setCustomSenderEmail(sender);
     localStorage.setItem(`hmail_resend_api_key_${currentUser?.username}`, key);
     localStorage.setItem(`hmail_resend_onboarding_${currentUser?.username}`, useOnboarding ? 'true' : 'false');
     localStorage.setItem(`hmail_resend_sender_${currentUser?.username}`, sender);
  };

  // IT Admin Policy values
  const [domainPolicy, setDomainPolicy] = useState<{
    allowExternalComm: boolean;
    allowConfidentialMode?: boolean;
    allowUndoSend?: boolean;
    allowEmailEncryption?: boolean;
    allowAutoSnooze?: boolean;
    allowSignatureBuilder?: boolean;
    allowWriteToneAnalyzer?: boolean;
    allowScheduledDispatch?: boolean;
    allowAttachmentSandbox?: boolean;
    allowTrackingPixels?: boolean;
    allowCustomAliases?: boolean;
  } | null>(null);

  // Parse username and domain to make pure target full emails
  const getTargetEmail = (u: string, dom: string) => {
    const cleanU = u.trim().toLowerCase();
    if (!cleanU) return "";
    if (cleanU.includes('@')) return cleanU;
    let cleanDom = dom.trim().toLowerCase();
    if (cleanDom && !cleanDom.startsWith('@')) {
      cleanDom = '@' + cleanDom;
    }
    return `${cleanU}${cleanDom || '@hmail.com'}`;
  };

  // Helper: Retrieve folder folder status
  const getMessageFolder = (msg: any): 'inbox' | 'starred' | 'sent' | 'drafts' | 'archive' | 'spam' | 'trash' | 'scheduled' => {
     if (msg.scheduledFor && msg.scheduledFor > Date.now()) {
        return 'scheduled';
     }
     if (msg.status && ['inbox', 'starred', 'sent', 'drafts', 'archive', 'spam', 'trash', 'scheduled'].includes(msg.status)) {
        return msg.status as any;
     }
     // Downward compatibility
     if (msg.isDraft || msg.status === 'draft') return 'drafts';
     if (msg.from === currentUser?.username) return 'sent';
     return 'inbox';
  };

  // Helper: Auto-categorize email based on text rules
  const getMessageCategory = (msg: any): 'primary' | 'social' | 'updates' | 'forums' => {
     if (msg.category) return msg.category;
     const subj = (msg.subject || "").toLowerCase();
     const body = (msg.body || "").toLowerCase();
     const from = (msg.from || "").toLowerCase();
     
     if (from.includes("social") || from.includes("linkedin") || from.includes("twitter") || from.includes("fb") || from.includes("instagram") || subj.includes("friend request") || subj.includes("tagged") || body.includes("commented")) {
        return "social";
     }
     if (subj.includes("newsletter") || subj.includes("receipt") || subj.includes("invoice") || subj.includes("payment") || body.includes("shipping") || body.includes("tracking") || body.includes("bill")) {
        return "updates";
     }
     if (from.includes("forum") || from.includes("group") || from.includes("slack") || from.includes("discord") || from.includes("reddit") || body.includes("replied to thread")) {
        return "forums";
     }
     return "primary";
  };

  // Sound Synth Generator
  const playNewMailChime = () => {
    if (!audioEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc1.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.15); // A5
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc2.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.15); // C6
      
      gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      
      osc1.stop(ctx.currentTime + 0.6);
      osc2.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.warn("Audio Context blocked or not supported:", e);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(collection(db, 'banned_emails'), (snapshot) => {
       const bans = snapshot.docs.map(d => d.data().email?.toLowerCase() || "");
       if (bans.includes(currentUser.username.toLowerCase())) {
          setCurrentUser(null);
          localStorage.removeItem('hmail_current_user');
          localStorage.removeItem('hmail_last_used_time');
          setMode('login');
          window.alert('Your HMail account has been banned.');
       }
    });
    return () => unsub();
  }, [currentUser]);

  // Real-time SSO Configuration sync
  useEffect(() => {
    const ssoRef = doc(db, 'hmail_sso_settings', 'config');
    const unsub = onSnapshot(ssoRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (typeof data.gatewayEnabled === 'boolean') {
          setSsoGatewayEnabled(data.gatewayEnabled);
        }
        if (typeof data.brotherAppAuthorized === 'boolean') {
          setBrotherAppAuthorized(data.brotherAppAuthorized);
        }
        if (typeof data.brotherAppUrl === 'string') {
          setBrotherAppUrl(data.brotherAppUrl);
        }
      }
    }, (err) => {
      console.warn("SSO Snapshot error:", err);
    });
    return () => unsub();
  }, []);

  // Subscribe to real-time Messages
  useEffect(() => {
    if (!currentUser) return;
    const lowerUser = currentUser.username.trim().toLowerCase();
    const cleanU = lowerUser.split('@')[0];
    const possibleUsernames = [
      lowerUser,
      cleanU,
      `${cleanU}@hmail.com`
    ];
    if (lowerUser.endsWith('@hmail.com')) {
      possibleUsernames.push(cleanU);
    }
    const uniqueUsernames = Array.from(new Set(possibleUsernames));

    // Subscription A: Incoming mails
    const qIn = query(collection(db, 'hmail_messages'), where('to', 'in', uniqueUsernames));
    const unsubIn = onSnapshot(qIn, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setIncomingMsgs(msgs);
    });

    // Subscription B: Outgoing mails & saved drafts
    const qOut = query(collection(db, 'hmail_messages'), where('from', '==', currentUser.username));
    const unsubOut = onSnapshot(qOut, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setOutgoingMsgs(msgs);
    });

    return () => {
      unsubIn();
      unsubOut();
    };
  }, [currentUser]);

  // Merge, blocklist filters, and sorting trigger
  useEffect(() => {
    const combined = [...incomingMsgs];
    outgoingMsgs.forEach(outMsg => {
      if (!combined.some(inMsg => inMsg.id === outMsg.id)) {
        combined.push(outMsg);
      }
    });

    // Filter out messages that are scheduled for delivery but haven't reached their unlock timestamp yet, unless the user is the sender
    const delivered = combined.filter(msg => {
       if (msg.scheduledFor && msg.scheduledFor > Date.now()) {
          return msg.from === currentUser?.username;
       }
       return true;
    });

    // Handle blocklist routing to trash
    const filtered = delivered.map(msg => {
       const isBlocked = blockedSenders.some(b => msg.from?.toLowerCase().trim() === b.toLowerCase().trim());
       if (isBlocked && getMessageFolder(msg) !== 'trash') {
          return { ...msg, status: 'trash' };
       }
       return msg;
    });

    // Apply Sort Order by timestamp
    filtered.sort((a: any, b: any) => {
      const aTime = a.timestamp?.toMillis ? a.timestamp.toMillis() : Date.now();
      const bTime = b.timestamp?.toMillis ? b.timestamp.toMillis() : Date.now();
      return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
    });

    setMessages(filtered);
  }, [incomingMsgs, outgoingMsgs, blockedSenders, sortOrder, currentUser]);

  // Audio Bell on incoming messages count increase
  const prevCountRef = useRef<number>(-1);
  useEffect(() => {
     if (incomingMsgs.length > 0) {
        if (prevCountRef.current !== -1 && incomingMsgs.length > prevCountRef.current) {
           playNewMailChime();
        }
        prevCountRef.current = incomingMsgs.length;
     } else {
        prevCountRef.current = 0;
     }
  }, [incomingMsgs]);

  // Auto-responder out of office policy
  useEffect(() => {
     if (!oooEnabled || !currentUser || incomingMsgs.length === 0) return;
     const latest = incomingMsgs[0];
     if (!latest) return;

     const isNew = latest.timestamp?.toMillis ? (Date.now() - latest.timestamp.toMillis() < 10000) : false;
     const isAutoReply = latest.subject?.startsWith("Re: [Auto-Reply]");
     
     if (isNew && latest.from !== currentUser.username && !isAutoReply) {
         const triggerAutoResponse = async () => {
             const key = `hmail_replied_${latest.id}`;
             if (sessionStorage.getItem(key)) return;
             sessionStorage.setItem(key, "true");
             
             try {
                await addDoc(collection(db, 'hmail_messages'), {
                  from: currentUser.username,
                  to: latest.from,
                  subject: `Re: [Auto-Reply] ${latest.subject || 'Out of Office'}`,
                  body: `${oooText}\n\n--- Auto-Reply ---\nOriginal message: "${latest.body?.substring(0, 60)}..."`,
                  timestamp: serverTimestamp(),
                  status: 'sent',
                  isRead: true,
                  category: 'primary'
                });
             } catch(e) {
                console.error("Auto responder failed:", e);
             }
         };
         triggerAutoResponse();
     }
  }, [incomingMsgs, oooEnabled, currentUser, oooText]);

  // Admin Registered policy load
  useEffect(() => {
    if (!currentUser) return;
    const emailStr = currentUser.username;
    if (!emailStr.includes('@')) return;
    const domain = '@' + emailStr.split('@')[1];
    
    const unsub = onSnapshot(doc(db, 'hmail_registered_domains', domain), (docSnap) => {
       if (docSnap.exists()) {
          const data = docSnap.data();
          setDomainPolicy({
             allowExternalComm: data.allowExternalComm !== false,
             allowConfidentialMode: data.allowConfidentialMode !== false,
             allowUndoSend: data.allowUndoSend !== false,
             allowEmailEncryption: data.allowEmailEncryption !== false,
             allowAutoSnooze: data.allowAutoSnooze !== false,
             allowSignatureBuilder: data.allowSignatureBuilder !== false,
             allowWriteToneAnalyzer: data.allowWriteToneAnalyzer !== false,
             allowScheduledDispatch: data.allowScheduledDispatch !== false,
             allowAttachmentSandbox: data.allowAttachmentSandbox !== false,
             allowTrackingPixels: data.allowTrackingPixels !== false,
             allowCustomAliases: data.allowCustomAliases !== false
          });
       } else {
          setDomainPolicy({
             allowExternalComm: true,
             allowConfidentialMode: true,
             allowUndoSend: true,
             allowEmailEncryption: true,
             allowAutoSnooze: true,
             allowSignatureBuilder: true,
             allowWriteToneAnalyzer: true,
             allowScheduledDispatch: true,
             allowAttachmentSandbox: true,
             allowTrackingPixels: true,
             allowCustomAliases: true
          });
       }
    });
    return () => unsub();
  }, [currentUser]);

  // IT admin created managed user fetch
  useEffect(() => {
    if (!currentUser?.isITAdmin) return;
    const q = query(collection(db, 'hmail_users'), where('createdByAdmin', '==', currentUser.username));
    const unsub = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setManagedUsers(users.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
    });
    return () => unsub();
  }, [currentUser]);

  // IT Admin domain rules policy changer
  const handleToggleDomainPolicy = async (policyKey: string = 'allowExternalComm') => {
     if (!currentUser) return;
     const emailStr = currentUser.username;
     if (!emailStr.includes('@')) return;
     const domain = '@' + emailStr.split('@')[1];
     
     const currentSetting = domainPolicy ? (domainPolicy as any)[policyKey] !== false : true;
     try {
        await setDoc(doc(db, 'hmail_registered_domains', domain), {
           [policyKey]: !currentSetting
        }, { merge: true });
        
        const policyNames: {[key: string]: string} = {
           allowExternalComm: 'External Routing',
           allowConfidentialMode: 'Confidential Expire Mode',
           allowUndoSend: 'Undo Send Countdown Buffer',
           allowEmailEncryption: 'AES-256 Client-Side Encryption',
           allowAutoSnooze: 'Email Sleep & Snooze Trigger',
           allowSignatureBuilder: 'Corporate Footer Signatures',
           allowWriteToneAnalyzer: 'Offline Tone Analysis Coach',
           allowScheduledDispatch: 'Delayed Dispatch Schedule',
           allowAttachmentSandbox: 'ZIP Sandbox Vulnerability Check',
           allowTrackingPixels: 'H-Track Double Check Tracking',
           allowCustomAliases: 'Masquerading Nicknames & Aliases'
        };
        
        setErrorMsg(`Managed Rules Adjusted: "${policyNames[policyKey] || policyKey}" is now ${!currentSetting ? 'ALLOWED' : 'RESTRICTED'}.`);
        setTimeout(() => setErrorMsg(""), 4000);
     } catch (err: any) {
        console.error(err);
        setErrorMsg("Error toggling registered policy: " + err.message);
     }
  };

  const handleSwitchAccount = (account: {username: string, isITAdmin?: boolean}) => {
    setCurrentUser(account);
    localStorage.setItem('hmail_current_user', JSON.stringify(account));
    localStorage.setItem('hmail_last_used_time', String(Date.now()));
    setMode('inbox');
    setErrorMsg("");
    setShowAccountDropdown(false);
  };

  const handleRemoveAccount = (usernameToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = allAccounts.filter(acc => acc.username.toLowerCase() !== usernameToRemove.toLowerCase());
    setAllAccounts(updated);
    localStorage.setItem('hmail_accounts_list', JSON.stringify(updated));
    
    if (currentUser?.username.toLowerCase() === usernameToRemove.toLowerCase()) {
      if (updated.length > 0) {
        setCurrentUser(updated[0]);
        localStorage.setItem('hmail_current_user', JSON.stringify(updated[0]));
        localStorage.setItem('hmail_last_used_time', String(Date.now()));
        setMode('inbox');
        setErrorMsg("");
      } else {
        setCurrentUser(null);
        localStorage.removeItem('hmail_current_user');
        localStorage.removeItem('hmail_last_used_time');
        setMode('login');
      }
    }
  };

  const handleDeleteUser = async (usernameToDelete: string) => {
    try {
      if (!window.confirm(`Delete account ${usernameToDelete}?`)) return;
      await deleteDoc(doc(db, 'hmail_users', usernameToDelete));
    } catch(err: any) {
      console.error(err);
      setErrorMsg("Error deleting account: " + (err?.message || err));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanU = getTargetEmail(username, userDomain);
    if (!cleanU || !password.trim()) {
       setErrorMsg("Please enter both username and password.");
       return;
    }
    
    // Check if banned
    const getDocsArray = await getDocs(query(collection(db, 'banned_emails'), where('email', '==', cleanU.toLowerCase())));
    if (!getDocsArray.empty) {
       setErrorMsg("This account has been banned.");
       return;
    }

    const pwHash = CryptoJS.SHA256(password.trim()).toString();
    try {
      const uDoc = await getDoc(doc(db, 'hmail_users', cleanU));
      
      if (!uDoc.exists()) {
         setErrorMsg("User not found or incorrect username.");
      } else {
         const data = uDoc.data();
         if (data.passwordHash !== pwHash) {
            setErrorMsg("Incorrect password.");
         } else {
            const userObj = { username: data.username, isITAdmin: data.isITAdmin };
            
            // Add to allAccounts list
            const exist = allAccounts.some(acc => acc.username.toLowerCase() === userObj.username.toLowerCase());
            let updatedList = [...allAccounts];
            if (!exist) {
               updatedList = [...allAccounts, userObj];
               setAllAccounts(updatedList);
            }
            localStorage.setItem('hmail_accounts_list', JSON.stringify(updatedList));

            setCurrentUser(userObj);
            localStorage.setItem('hmail_current_user', JSON.stringify(userObj));
            localStorage.setItem('hmail_last_used_time', String(Date.now()));
            setMode('inbox');
            setErrorMsg("");
            setUsername("");
            setPassword("");
         }
      }
    } catch(err: any) {
      console.error(err);
      setErrorMsg("Error communicating with server: " + (err?.message || err));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanU = getTargetEmail(username, isRegisteringAdmin ? adminDomain : userDomain);
    
    if (!cleanU || !password.trim()) {
       setErrorMsg("Please enter both username and password.");
       return; 
    }

    const parts = cleanU.split('@');
    const finalDomain = '@' + parts[1];

    if (isRegisteringAdmin && finalDomain.toLowerCase() === '@hmail.com') {
       setErrorMsg("IT Admin accounts are not allowed to use the @hmail.com domain. It is reserved for personal accounts only.");
       return;
    }
    
    if (isRegisteringAdmin && adminCode.trim() !== 'IT_ADMIN_2026') {
       setErrorMsg("Invalid IT Admin One-Time Code. Hint: IT_ADMIN_2026");
       return;
    }
    
    try {
      // Check if banned
      const getDocsArray = await getDocs(query(collection(db, 'banned_emails'), where('email', '==', cleanU.toLowerCase())));
      if (!getDocsArray.empty) {
         setErrorMsg("This account has been banned.");
         return;
      }
      
      if (isRegisteringAdmin && finalDomain !== '@hmail.com') {
         const domainDoc = await getDoc(doc(db, 'hmail_registered_domains', finalDomain));
         if (domainDoc.exists()) {
            setErrorMsg(`The domain "${finalDomain}" is already registered by another company.`);
            return;
         }
      }

      const uDoc = await getDoc(doc(db, 'hmail_users', cleanU));
      if (uDoc.exists()) {
         setErrorMsg("Username already exists.");
         return;
      }
      
      const pwHash = CryptoJS.SHA256(password.trim()).toString();
      await setDoc(doc(db, 'hmail_users', cleanU), {
         username: cleanU,
         domain: finalDomain,
         passwordHash: pwHash,
         isITAdmin: isRegisteringAdmin,
         createdAt: serverTimestamp()
      });

      if (isRegisteringAdmin && finalDomain !== '@hmail.com') {
         await setDoc(doc(db, 'hmail_registered_domains', finalDomain), {
            registeredBy: cleanU,
            createdAt: serverTimestamp(),
            allowExternalComm: true
         });
      }

      const userObj = { username: cleanU, isITAdmin: isRegisteringAdmin };
      
      // Add to allAccounts list
      const exist = allAccounts.some(acc => acc.username.toLowerCase() === userObj.username.toLowerCase());
      let updatedList = [...allAccounts];
      if (!exist) {
         updatedList = [...allAccounts, userObj];
         setAllAccounts(updatedList);
      }
      localStorage.setItem('hmail_accounts_list', JSON.stringify(updatedList));

      setCurrentUser(userObj);
      localStorage.setItem('hmail_current_user', JSON.stringify(userObj));
      localStorage.setItem('hmail_last_used_time', String(Date.now()));
      setMode('inbox');
      setErrorMsg("");
      setUsername("");
      setPassword("");
    } catch(err: any) {
      console.error(err);
      setErrorMsg("Error registering user: " + (err?.message || err));
    }
  };

  const handleAdminCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawU = newUsername.trim().toLowerCase();
    const adminDomainStr = currentUser?.username.includes('@') ? '@' + currentUser!.username.split('@')[1] : '@hmail.com';
    let cleanU = rawU;
    if (adminDomainStr && !rawU.includes('@')) {
       cleanU = `${rawU}${adminDomainStr}`;
    }

    if (!cleanU || !newPassword.trim()) {
       setErrorMsg("Please enter both username and password.");
       return; 
    }
    
    try {
       const uDoc = await getDoc(doc(db, 'hmail_users', cleanU));
       if (uDoc.exists()) {
         setErrorMsg("Username already exists.");
         return;
       }
       
       const pwHash = CryptoJS.SHA256(newPassword.trim()).toString();
       await setDoc(doc(db, 'hmail_users', cleanU), {
          username: cleanU,
          passwordHash: pwHash,
          createdByAdmin: currentUser?.username,
          createdAt: serverTimestamp()
       });
       setNewUsername('');
       setNewPassword('');
       setErrorMsg("Account created successfully!");
       setTimeout(() => setErrorMsg(""), 3500);
    } catch(err: any) {
       console.error(err);
       setErrorMsg("Error creating account: " + (err?.message || err));
    }
  };

  // Draft Loader action
  const handleLoadDraft = (msg: any) => {
     setComposeTo(msg.to || '');
     setComposeSubject(msg.subject || '');
     setComposeBody(msg.body || '');
     setComposePriority(msg.priority || 'low');
     setMode('compose');
     deleteDoc(doc(db, 'hmail_messages', msg.id)).catch(console.error);
  };

  // Save Draft core action
  const handleSaveDraft = async () => {
     const rawTo = composeTo.trim().toLowerCase();
     try {
        let recipientId = rawTo;
        if (rawTo && !rawTo.includes('@')) {
            const myDomain = currentUser?.username.includes('@') 
               ? '@' + currentUser!.username.split('@')[1] 
               : '@hmail.com';
            recipientId = `${rawTo}${myDomain}`;
        }

        await addDoc(collection(db, 'hmail_messages'), {
          from: currentUser?.username,
          to: recipientId || '',
          subject: composeSubject.trim() || 'Untitled Draft',
          body: composeBody.trim(),
          timestamp: serverTimestamp(),
          status: 'drafts',
          priority: composePriority,
          isRead: true,
          category: 'primary'
        });
        
        setMode('inbox');
        setActiveFolder('drafts');
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        setErrorMsg("Draft saved safely inside drafts directory.");
        setTimeout(() => setErrorMsg(""), 3000);
     } catch (err: any) {
        console.error(err);
        setErrorMsg("Error saving draft: " + (err?.message || err));
     }
  };

  // Handle messages dispatch send
  // Actual delivery process to Firestore + SMTP Gateway
  const dispatchEmail = async (emailData: any) => {
    setComposingMsg(true);
    try {
       const recipientId = emailData.to;
       let finalBody = emailData.body;
       const isExternalRouting = emailData.isExternalRouting;
       
       let sentRealMail = false;
       let realMailError = "";

       const isEncryptionAllowed = domainPolicy?.allowEmailEncryption !== false;
       let encryptActivatedMark = false;
       if (isEncryptionAllowed && emailData.encryptCompose) {
          const enc = CryptoJS.AES.encrypt(finalBody, "hmail-key-shield-gcm").toString();
          finalBody = "PGPENC_AES_" + enc;
          encryptActivatedMark = true;
       }
       
       const finalFrom = (domainPolicy?.allowCustomAliases !== false && emailData.customAlias) 
          ? emailData.customAlias 
          : currentUser?.username;

       if (isExternalRouting && resendApiKey) {
          try {
             const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                   'Authorization': `Bearer ${resendApiKey}`,
                   'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                   from: useOnboardingDomain ? 'onboarding@resend.dev' : customSenderEmail,
                   to: [recipientId],
                   subject: emailData.subject || 'No Subject (H Mail)',
                   html: `
                      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #f8fafc;">
                         <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 20px;">
                            <h2 style="color: #1e293b; margin: 0 0 4px 0; font-family: system-ui, sans-serif;">H Mail Secure Message Gateway</h2>
                            <p style="color: #64748b; font-size: 11px; margin: 0; font-family: monospace;">Secure Transmitted Packet from <strong>${finalFrom}</strong></p>
                         </div>
                         <div style="color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-wrap; background-color: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                            ${finalBody.replace(/\n/g, '<br/>')}
                         </div>
                         <div style="color: #94a3b8; font-size: 10px; margin-top: 25px; border-top: 1px solid #eaeaea; padding-top: 12px; font-style: italic; text-align: center; line-height: 1.4;">
                            This secure message was sent through the user-integrated Resend API on H Mail.<br/>
                            If this was sent in error, please disregard.
                         </div>
                      </div>
                   `
                })
             });
             
             if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                realMailError = errData.message || `HTTP Server Status ${res.status}`;
             } else {
                sentRealMail = true;
             }
          } catch (e: any) {
             realMailError = e?.message || String(e);
          }
       }

       const payload: any = {
         from: finalFrom,
         to: recipientId,
         subject: emailData.subject || 'No Subject',
         body: finalBody.trim(),
         timestamp: serverTimestamp(),
         status: 'inbox',
         isRead: false,
         priority: emailData.priority || 'low',
         category: emailData.category || 'primary',
         gatewayDelivery: sentRealMail ? 'resend_successful' : (isExternalRouting ? 'sandboxed_only' : 'internal_successful'),
         gatewayError: realMailError || null
       };

       if (encryptActivatedMark) {
         payload.isEncrypted = true;
       }

       if (emailData.expiresAt) {
         payload.expiresAt = emailData.expiresAt;
       }

       if (emailData.scheduledFor) {
         payload.scheduledFor = emailData.scheduledFor;
       }

       if (emailData.trackingPixelActive) {
         payload.trackingPixelActive = true;
       }

       if (emailData.attachmentFiles?.length > 0) {
         payload.attachmentFiles = emailData.attachmentFiles;
       }

       await addDoc(collection(db, 'hmail_messages'), payload);

       setMode('inbox');
       setComposeTo('');
       setComposeSubject('');
       setComposeBody('');
       setEncryptCompose(false);
       setSelfDestructOption(0);
       setScheduledDelayOption(0);
       setTrackingPixelActive(false);
       setLocalToneSelection('none');
       setAttachmentFiles([]);
       
       if (isExternalRouting) {
          if (resendApiKey) {
             if (sentRealMail) {
                setErrorMsg("Message sent successfully! (Real delivery dispatched over the internet via Resend API to " + recipientId + ")");
             } else {
                setErrorMsg("Message sent successfully to local folders, but Resend API failed: " + realMailError);
             }
          } else {
             setErrorMsg("External routing simulated successfully! The message is stored in firestore sandbox drawers.");
          }
       } else {
          setErrorMsg("Message sent successfully!");
       }
       setTimeout(() => setErrorMsg(""), 5000);
    } catch (e: any) {
       console.error(e);
       setErrorMsg("Error transmitting packet: " + e.message);
    } finally {
       setComposingMsg(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawTo = composeTo.trim().toLowerCase();
    if (!rawTo) return;
    
    let recipientId = rawTo;
    if (!rawTo.includes('@')) {
        const myDomain = currentUser?.username.includes('@') 
           ? '@' + currentUser!.username.split('@')[1] 
           : '@hmail.com';
        recipientId = `${rawTo}${myDomain}`;
    }

    const getDomain = (email: string) => {
      if (!email.includes('@')) return '@hmail.com';
      return '@' + email.split('@')[1].toLowerCase();
    };

    const senderDomain = getDomain(currentUser?.username || "");
    const recipientDomain = getDomain(recipientId);

    let isExternalRouting = false;
    if (recipientId !== 'hproductnotifications@gmail.com' && recipientDomain !== senderDomain) {
       isExternalRouting = true;
       if (domainPolicy && !domainPolicy.allowExternalComm) {
          setErrorMsg(`External Routing Blocked: Domain policy prevents sending messages outside your company domain (${senderDomain}).`);
          return;
       }
    }

    let finalBody = composeBody;
    if (signatureEnabled && signatureText.trim() && domainPolicy?.allowSignatureBuilder !== false) {
       finalBody = `${composeBody}\n\n---\n${signatureText}`;
    }

    const computedCategory = getMessageCategory({ subject: composeSubject, body: composeBody, from: currentUser?.username });

    let expiresAt: number | null = null;
    if (selfDestructOption > 0 && domainPolicy?.allowConfidentialMode !== false) {
       expiresAt = Date.now() + selfDestructOption;
    }

    let scheduledFor: number | null = null;
    if (scheduledDelayOption > 0 && domainPolicy?.allowScheduledDispatch !== false) {
       scheduledFor = Date.now() + scheduledDelayOption;
    }

    const emailData = {
       to: recipientId,
       subject: composeSubject.trim() || 'No Subject',
       body: finalBody,
       priority: composePriority,
       category: computedCategory,
       isExternalRouting,
       encryptCompose,
       expiresAt,
       scheduledFor,
       trackingPixelActive,
       customAlias: customAlias.trim(),
       attachmentFiles: attachmentFiles.map(f => ({ ...f, securityStatus: 'clean' }))
    };

    const isUndoSendAllowed = domainPolicy?.allowUndoSend !== false;
    if (isUndoSendAllowed && undoSendDelay > 0 && !scheduledFor) { 
       setMode('inbox');
       setPendingUndoEmail(emailData);
       setUndoCountdown(undoSendDelay);
       
       if (undoIntervalId) clearInterval(undoIntervalId);
       
       const interval = setInterval(() => {
          setUndoCountdown((prev) => {
             if (prev <= 1) {
                clearInterval(interval);
                setUndoIntervalId(null);
                dispatchEmail(emailData);
                setPendingUndoEmail(null);
                return 0;
             }
             return prev - 1;
          });
       }, 1000);
       setUndoIntervalId(interval);
       setErrorMsg(`Email sending queued... you have ${undoSendDelay} seconds to undo.`);
       setTimeout(() => setErrorMsg(""), 3000);
    } else {
       dispatchEmail(emailData);
    }
  };

  const handleUndoSendAction = () => {
     if (undoIntervalId) {
        clearInterval(undoIntervalId);
        setUndoIntervalId(null);
     }
     if (pendingUndoEmail) {
        setMode('compose');
        setComposeTo(pendingUndoEmail.to);
        const subText = pendingUndoEmail.subject === "No Subject" ? "" : pendingUndoEmail.subject;
        setComposeSubject(subText);
        // Stripping signature from restore if signature is appended so we don't duplicate it
        let stripBody = pendingUndoEmail.body;
        if (signatureText && stripBody.endsWith(`\n\n---\n${signatureText}`)) {
           stripBody = stripBody.substring(0, stripBody.length - `\n\n---\n${signatureText}`.length);
        }
        setComposeBody(stripBody);
        setPendingUndoEmail(null);
        setErrorMsg("Send undone! Message returned to editor draft.");
        setTimeout(() => setErrorMsg(""), 4000);
     }
  };

  // Update inline Firestore document fields (Starred, reading, archiving status)
  const handleUpdateMessageField = async (id: string, field: string, value: any) => {
     try {
        await setDoc(doc(db, 'hmail_messages', id), { [field]: value }, { merge: true });
     } catch(err) {
        console.error("Error setting email parameter:", err);
     }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      const msg = messages.find(m => m.id === id);
      if (getMessageFolder(msg) === 'trash') {
         // Deep permanent delete if already in trash directory
         await deleteDoc(doc(db, 'hmail_messages', id));
      } else {
         // Soft delete to trash folder
         await handleUpdateMessageField(id, 'status', 'trash');
      }
    } catch(err) { console.error(err); }
  };

  // Bulk selectors
  const handleToggleSelectAll = (filteredList: any[]) => {
     if (selectedIds.length === filteredList.length) {
        setSelectedIds([]);
     } else {
        setSelectedIds(filteredList.map(m => m.id));
     }
  };

  const handleToggleSelectRow = (id: string) => {
     setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkTrash = async (filteredList: any[]) => {
     const targets = filteredList.filter(m => selectedIds.includes(m.id));
     for (const msg of targets) {
        if (getMessageFolder(msg) === 'trash') {
           await deleteDoc(doc(db, 'hmail_messages', msg.id));
        } else {
           await handleUpdateMessageField(msg.id, 'status', 'trash');
        }
     }
     setSelectedIds([]);
  };

  const handleBulkArchive = async (filteredList: any[]) => {
     const targets = filteredList.filter(m => selectedIds.includes(m.id));
     for (const msg of targets) {
        await handleUpdateMessageField(msg.id, 'status', 'archive');
     }
     setSelectedIds([]);
  };

  const handleBulkMarkRead = async (filteredList: any[]) => {
     const targets = filteredList.filter(m => selectedIds.includes(m.id));
     for (const msg of targets) {
        await handleUpdateMessageField(msg.id, 'isRead', true);
     }
     setSelectedIds([]);
  };

  const handleGlobalMarkAllRead = async (filteredList: any[]) => {
      for (const msg of filteredList) {
         await handleUpdateMessageField(msg.id, 'isRead', true);
      }
  };

  const handleEmptyTrash = async () => {
     if (!window.confirm("Permanently wipe all messages inside the Trash folder?")) return;
     const items = messages.filter(m => getMessageFolder(m) === 'trash');
     for (const m of items) {
        await deleteDoc(doc(db, 'hmail_messages', m.id));
     }
  };

  // Local signature values storage
  const handleSaveSignature = (txt: string) => {
     setSignatureText(txt);
     localStorage.setItem(`hmail_sig_${currentUser?.username}`, txt);
  };
  const handleToggleSsoGateway = async () => {
    setSsoProcessing(true);
    setActionSuccessMessage("");
    try {
      const nextVal = !ssoGatewayEnabled;
      await setDoc(doc(db, 'hmail_sso_settings', 'config'), {
        gatewayEnabled: nextVal,
        lastUpdated: serverTimestamp(),
        updatedBy: currentUser?.username || 'admin'
      }, { merge: true });
      setSsoGatewayEnabled(nextVal);
      setActionSuccessMessage(nextVal ? "SSO Gateway enabled successfully!" : "SSO Gateway disabled successfully!");
      setTimeout(() => setActionSuccessMessage(""), 5500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("SSO Update Error: " + (err?.message || err));
    } finally {
      setSsoProcessing(false);
    }
  };

  const handleAuthorizeBrotherApp = async () => {
    setSsoProcessing(true);
    setActionSuccessMessage("");
    try {
      const nextVal = !brotherAppAuthorized;
      await setDoc(doc(db, 'hmail_sso_settings', 'config'), {
        brotherAppAuthorized: nextVal,
        authorizedAt: nextVal ? serverTimestamp() : null,
        authorizedBy: currentUser?.username || 'admin'
      }, { merge: true });
      setBrotherAppAuthorized(nextVal);
      
      if (nextVal) {
        setActionSuccessMessage("Hmail SSO Authorized! Your brother's system can now log in securely.");
      } else {
        setActionSuccessMessage("SSO Authorization Revoked successfully.");
      }
      setTimeout(() => setActionSuccessMessage(""), 5500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("SSO Partner Auth Error: " + (err?.message || err));
    } finally {
      setSsoProcessing(false);
    }
  };

  const handleUpdateBrotherAppUrl = async (url: string) => {
    setSsoProcessing(true);
    setActionSuccessMessage("");
    try {
      await setDoc(doc(db, 'hmail_sso_settings', 'config'), {
        brotherAppUrl: url.trim(),
        lastUpdated: serverTimestamp(),
        updatedBy: currentUser?.username || 'admin'
      }, { merge: true });
      setBrotherAppUrl(url.trim());
      setActionSuccessMessage("SSO Companion App URL updated successfully!");
      setTimeout(() => setActionSuccessMessage(""), 5500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to update companion application URL: " + (err?.message || err));
    } finally {
      setSsoProcessing(false);
    }
  };

  const handleDownloadSsoConfig = () => {
    try {
      const configObj = {
        app_name: "Hmail Secure Identity Provider",
        sso_gateway_active: ssoGatewayEnabled,
        partner_authorized: brotherAppAuthorized,
        brother_app_url: brotherAppUrl || "Not Configured",
        client_auth_status: brotherAppAuthorized ? "AUTHORIZED" : "SUSPENDED",
        provider_endpoint: "https://firestore.googleapis.com/v1/projects/opportune-helix-bcf5x/databases/ai-studio-cc57e9a3-f86d-4fd8-981d-fa170ef7dd16/documents/",
        firebase_configuration: {
          apiKey: "AIzaSyAg8H1IQl3mMXHFDpqXySWo1GzkU5yhJj0",
          authDomain: "opportune-helix-bcf5x.firebaseapp.com",
          projectId: "opportune-helix-bcf5x",
          storageBucket: "opportune-helix-bcf5x.firebasestorage.app",
          messagingSenderId: "1010756121584",
          appId: "1:1010756121584:web:cb8644093b10d11b872335"
        },
        setup_instructions: "Place this configuration at the root of your frontend/backend application to configure secure SSO logins. Call getDoc(doc(db, 'hmail_users', email)) to verify authentication hashes."
      };
      
      const blob = new Blob([JSON.stringify(configObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'hmail-sso-config.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setActionSuccessMessage("Success! Downloaded hmail-sso-config.json connection bundle.");
      setTimeout(() => setActionSuccessMessage(""), 5500);
    } catch (err: any) {
      setErrorMsg("Failed to generate configuration download: " + (err?.message || err));
    }
  };

  const handleToggleSignature = (val: boolean) => {
     setSignatureEnabled(val);
     localStorage.setItem(`hmail_sig_enabled_${currentUser?.username}`, String(val));
  };

  const handleTestSsoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ssoTesterUsername.trim() || !ssoTesterPassword.trim()) {
      setSsoTesterResult({ success: false, message: "Please enter both tester username and password." });
      return;
    }
    setSsoTesterLoading(true);
    setSsoTesterResult(null);
    try {
      const cleanU = getTargetEmail(ssoTesterUsername, '@hmail.com');
      const pwHash = CryptoJS.SHA256(ssoTesterPassword.trim()).toString();
      
      // Check if user has been banned from the Hmail infrastructure
      const banQuery = await getDocs(query(collection(db, 'banned_emails'), where('email', '==', cleanU.toLowerCase())));
      if (!banQuery.empty) {
         setSsoTesterResult({ 
           success: false, 
           message: `Authentication Failed: This account ("${cleanU}") has been banned on the network.` 
         });
         return;
      }
      
      const uDoc = await getDoc(doc(db, 'hmail_users', cleanU));
      if (!uDoc.exists()) {
         setSsoTesterResult({ 
           success: false, 
           message: `Authentication Failed: User account "${cleanU}" was not found in hmail_users database.` 
         });
      } else {
         const data = uDoc.data();
         if (data.passwordHash !== pwHash) {
            setSsoTesterResult({ 
              success: false, 
              message: "Authentication Failed: Incorrect password hash mismatch." 
            });
         } else {
            // Generate a simulated JWT SSO token
            const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
            const payload = btoa(JSON.stringify({ 
              sub: cleanU, 
              name: cleanU.split('@')[0], 
              iss: "hmail-sso-gateway", 
              admin: !!data.isITAdmin,
              exp: Math.floor(Date.now() / 1000) + 3600 
            }));
            const signature = btoa(CryptoJS.SHA256(header + "." + payload + "_HMAIL_SSO_SECRET_KEY_2026").toString());
            const simulatedToken = `${header}.${payload}.${signature.substring(0, 24)}`;

            setSsoTesterResult({ 
              success: true, 
              token: simulatedToken,
              message: "Authentication Success! SSO Credentials Verified.",
              profile: {
                username: data.username,
                isITAdmin: !!data.isITAdmin,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : 'N/A'
              }
            });
         }
      }
    } catch (err: any) {
      console.error(err);
      setSsoTesterResult({ success: false, message: "SSO Hub Database Error: " + (err?.message || err) });
    } finally {
      setSsoTesterLoading(false);
    }
  };

  // Local out of office settings toggling
  const handleSaveOooSettings = (enabled: boolean, text: string) => {
     setOooEnabled(enabled);
     setOooText(text);
     localStorage.setItem(`hmail_ooo_enabled_${currentUser?.username}`, String(enabled));
     localStorage.setItem(`hmail_ooo_text_${currentUser?.username}`, text);
  };

  // Blocklist updates
  const handleAddBlockedUser = (e: React.FormEvent) => {
     e.preventDefault();
     const cleanBlock = newBlockedEmail.trim().toLowerCase();
     if (!cleanBlock || blockedSenders.includes(cleanBlock)) return;
     const updated = [...blockedSenders, cleanBlock];
     setBlockedSenders(updated);
     localStorage.setItem(`hmail_blocked_${currentUser?.username}`, JSON.stringify(updated));
     setNewBlockedEmail('');
  };

  const handleRemoveBlockedUser = (email: string) => {
     const updated = blockedSenders.filter(x => x !== email);
     setBlockedSenders(updated);
     localStorage.setItem(`hmail_blocked_${currentUser?.username}`, JSON.stringify(updated));
  };

  // Export File Text action helper
  const handleExportEmail = (msg: any) => {
     try {
        const textContent = `Subject: ${msg.subject || 'No Subject'}\nFrom: ${msg.from}\nTo: ${msg.to}\nDate: ${msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toString() : 'N/A'}\nPriority: ${msg.priority || 'low'}\n\nMessage Body:\n${msg.body}`;
        const blob = new Blob([textContent], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `email_${msg.id.substring(0, 6)}.txt`;
        link.click();
     } catch (err) {
        console.error("Export text failed", err);
     }
  };

  // Interactive message expand handler with read setting
  const handleExpandMessage = (id: string, currentlyUnread: boolean) => {
     setExpandedId(prev => prev === id ? null : id);
     if (currentlyUnread) {
        handleUpdateMessageField(id, 'isRead', true);
     }
  };

  // Quick templates suggested responses
  const quickTemplateReplies = [
     "Acknowledged. Will review and write back shortly.",
     "Got it! Thanks for the information.",
     "Approved. Let us proceed with this action.",
     "Interesting point. Let's arrange a sync soon."
  ];

  // Routing Folder definition list with icons
  const listFolders = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, color: 'text-blue-400' },
    { id: 'starred', label: 'Starred', icon: Star, color: 'text-yellow-400 animate-pulse' },
    { id: 'scheduled', label: 'Scheduled', icon: Clock, color: 'text-sky-400' },
    { id: 'sent', label: 'Sent Folder', icon: Send, color: 'text-green-400' },
    { id: 'drafts', label: 'Drafts Folder', icon: Bookmark, color: 'text-purple-400' },
    { id: 'archive', label: 'Archived File', icon: Archive, color: 'text-amber-400' },
    { id: 'spam', label: 'Spam Junk', icon: AlertOctagon, color: 'text-rose-400' },
    { id: 'trash', label: 'Trash Bin', icon: Trash2, color: 'text-slate-400' },
  ] as const;

  // Render Logged Out View
  if (!currentUser) {
     return (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-[500px] flex flex-col p-6 font-sans mx-auto">
          <div className="flex flex-col p-8 liquid-glass justify-center relative overflow-hidden bg-slate-950/80 border border-white/10 rounded-3xl shadow-3xl">
             
             <div className="flex flex-col mb-8 items-center text-center relative z-10">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-4 text-blue-400 font-bold shadow-lg">
                   <Mail className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center whitespace-nowrap">H studio <span className="text-white/30 mx-3 font-normal">/</span> H mail</h1>
                <p className="text-[#9fb0d0]/70 text-sm mt-2">{mode === 'login' ? 'Sign in to access your secure mailbox.' : 'Create your secure H mail account.'}</p>
             </div>
             
             <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="flex flex-col gap-4 relative z-10">
                {errorMsg && <div className="text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-[16px] text-center font-medium">{errorMsg}</div>}
                
                <div>
                   <label className="text-xs font-bold text-white/50 mb-2 pl-2 flex items-center gap-2">
                      <User className="w-3 h-3" /> {mode === 'login' ? 'H Mail ID (Full Email or Username)' : 'H Mail ID / Username'}
                   </label>
                   {mode === 'login' ? (
                      <div className="flex flex-col gap-1.5">
                         <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-black/40 border border-white/10 px-5 py-4 rounded-[16px] text-white outline-none focus:border-blue-400/50 transition-colors text-sm" placeholder="e.g. alex@hmail.com or alex@company.com" />
                         <p className="text-[10px] text-[#9fb0d0]/50 px-2 font-mono">Tip: Type your full email to sign in to any custom company domain from any device.</p>
                      </div>
                   ) : (
                      <div className="flex">
                         <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="flex-1 bg-black/40 border border-white/10 px-5 py-4 rounded-l-xl text-white outline-none focus:border-blue-400/50 transition-colors" placeholder="username" />
                         {isRegisteringAdmin ? (
                             <input type="text" value={adminDomain} onChange={e => setAdminDomain(e.target.value)} className="bg-black/40 border border-white/10 border-l-0 px-3 py-4 rounded-r-xl text-[#9fb0d0]/90 font-mono text-sm w-36 outline-none focus:border-blue-400/50" placeholder="@company.com" />
                         ) : (
                             <input type="text" value={userDomain} onChange={e => setUserDomain(e.target.value)} className="bg-black/40 border border-white/10 border-l-0 px-3 py-4 rounded-r-xl text-[#9fb0d0]/90 font-mono text-sm w-36 outline-none focus:border-blue-400/50" placeholder="@hmail.com" />
                         )}
                      </div>
                   )}
                </div>
                <div>
                   <label className="text-xs font-bold text-white/50 mb-2 pl-2 flex items-center gap-2"><Key className="w-3 h-3" /> Password</label>
                   <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black/40 border border-white/10 px-5 py-4 rounded-[16px] text-white outline-none focus:border-blue-400/50 transition-colors" placeholder="••••••••" />
                </div>
                {mode === 'register' && (
                   <div className="flex flex-col gap-3 p-4 bg-white/5 border border-white/10 rounded-[16px]">
                      <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                         <input type="checkbox" checked={isRegisteringAdmin} onChange={e => setIsRegisteringAdmin(e.target.checked)} className="rounded bg-black/40 border-white/20 text-blue-500 focus:ring-blue-500/50" />
                         Register as IT Admin Account?
                      </label>
                      {isRegisteringAdmin && (
                         <input type="text" value={adminCode} onChange={e => setAdminCode(e.target.value)} placeholder="One-Time Admin Code (IT_ADMIN_2026)" className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-[16px] text-white outline-none focus:border-blue-400/50 text-sm" />
                      )}
                   </div>
                )}
                <button type="submit" className="mt-4 w-full bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 text-white font-bold py-4 rounded-[16px] shadow-sm border border-white/5 transition-all text-sm">
                   {mode === 'login' ? 'Sign In' : 'Create Account'}
                </button>
             </form>
             
             <div className="mt-6 text-center z-10">
                <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErrorMsg(""); setUsername(""); setPassword("") }} className="text-[#9fb0d0]/60 hover:text-white transition-colors text-xs font-semibold">
                   {mode === 'login' ? 'Need an account? Register now' : 'Already have an account? Sign in'}
                </button>
             </div>

             {allAccounts.length > 0 && (
                <div className="mt-6 border-t border-white/10 pt-6 relative z-10 text-left">
                   <p className="text-[10px] text-[#9fb0d0]/50 font-bold text-center mb-3">Fast Session Switcher</p>
                   <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                      {allAccounts.map(acc => (
                         <div key={acc.username} onClick={() => handleSwitchAccount(acc)} className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 rounded-[16px] cursor-pointer transition-all group">
                            <div className="flex items-center gap-2.5">
                               <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                                  <User className="w-3.5 h-3.5" />
                               </div>
                               <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-semibold text-white truncate max-w-[200px]">{acc.username}</span>
                                  {acc.isITAdmin && <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider">IT Admin</span>}
                               </div>
                            </div>
                            <button onClick={(e) => handleRemoveAccount(acc.username, e)} className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Remove Session">
                               <X className="w-3.5 h-3.5" />
                            </button>
                         </div>
                      ))}
                   </div>
                </div>
             )}
          </div>
        </motion.div>
     );
  }

  // Active folder messages extraction helper with search filtration
  const filteredMessages = messages.filter(msg => {
     const folder = getMessageFolder(msg);
     if (folder !== activeFolder) return false;
     
     // Inbox categorizations tabs filter
     if (activeFolder === 'inbox') {
        const cat = getMessageCategory(msg);
        if (cat !== activeCategory) return false;
     }

     // User-specific text search filters
     if (searchQuery.trim()) {
        const queryClean = searchQuery.toLowerCase().trim();
        
        // Search operator tags support: sender:alex, subject:urgent, body:password, is:starred
        if (queryClean.startsWith('sender:')) {
           const senderVal = queryClean.replace('sender:', '');
           return msg.from?.toLowerCase().includes(senderVal);
        }
        if (queryClean.startsWith('subject:')) {
           const subjVal = queryClean.replace('subject:', '');
           return msg.subject?.toLowerCase().includes(subjVal);
        }
        if (queryClean.startsWith('body:')) {
           const bodyVal = queryClean.replace('body:', '');
           return msg.body?.toLowerCase().includes(bodyVal);
        }
        if (queryClean === 'is:starred') {
           return !!msg.isStarred;
        }
        
        const stringConcat = `${msg.subject || ''} ${msg.body || ''} ${msg.from || ''} ${msg.to || ''}`.toLowerCase();
        return stringConcat.includes(queryClean);
     }
     return true;
  });

  // Dynamic counter badge numbers resolve
  const getBadgeCount = (folderType: typeof listFolders[number]['id']) => {
     return messages.filter(msg => {
        const f = getMessageFolder(msg);
        if (f !== folderType) return false;
        if (folderType === 'inbox') return !msg.isRead;
        if (folderType === 'drafts') return true;
        if (folderType === 'trash') return true;
        return false;
     }).length;
  };

  return (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-7xl flex flex-col p-4 md:p-6 font-sans mx-auto">
          
          <motion.header className="relative z-50 flex flex-col sm:flex-row sm:items-center justify-between px-6 md:px-8 py-5 mb-6 liquid-glass gap-4 bg-slate-900/60 border border-white/10 rounded-2xl" style={{ overflow: 'visible' }}>
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg">
                  <Mail className="w-5 h-5" />
               </div>
               <div>
                  <h1 className="text-xl font-bold tracking-tighter text-white flex items-center leading-none whitespace-nowrap gap-2">
                     H studio <span className="text-white/30 font-normal">/</span> H mail
                     {currentUser.isITAdmin && <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-[10px] uppercase font-bold tracking-widest">IT Admin</span>}
                  </h1>
                  <p className="text-xs text-[#9fb0d0]/70 font-mono mt-1">{currentUser.username}</p>
               </div>
             </div>
             
             <div className="flex items-center gap-2">
                <button onClick={() => setAudioEnabled(!audioEnabled)} className="p-2 border border-white/10 bg-white/5 hover:bg-white/10 rounded-[16px] text-[#9fb0d0] transition-colors" title={audioEnabled ? "Mute New Mail Sound Hook" : "Enable New Mail Sound Hook"}>
                   {audioEnabled ? <Volume2 className="w-4 h-4 text-green-400" /> : <VolumeX className="w-4 h-4 text-red-400" />}
                </button>
                <button onClick={() => setShowSettingsTray(!showSettingsTray)} className={`p-2 border border-white/10 rounded-[16px] text-[#9fb0d0] transition-colors ${showSettingsTray ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 hover:bg-white/10'}`} title="Inbox Preferences Configuration">
                   <Settings className="w-4 h-4 animate-spin-slow" />
                </button>
                {/* Multi-Account Selector with custom popover */}
                <div className="relative">
                   <button 
                      onClick={() => setShowAccountDropdown(!showAccountDropdown)} 
                      className="px-4 py-2 border border-white/10 bg-white/5 hover:bg-white/10 rounded-[16px] text-xs font-bold transition-all text-[#9fb0d0] flex items-center gap-2 hover:border-white/20 active:scale-95"
                      title="Manage Secure Sessions"
                   >
                      <User className="w-3.5 h-3.5 text-blue-400" />
                      <span className="max-w-[120px] truncate">{currentUser.username.split('@')[0]}</span>
                      <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                   </button>
                   
                   <AnimatePresence>
                      {showAccountDropdown && (
                         <>
                            {/* Backdrop click catch */}
                            <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowAccountDropdown(false)} />
                            
                            <motion.div 
                               initial={{ opacity: 0, y: 10, scale: 0.95 }}
                               animate={{ opacity: 1, y: 0, scale: 1 }}
                               exit={{ opacity: 0, y: 10, scale: 0.95 }}
                               transition={{ duration: 0.15 }}
                               className="absolute right-0 mt-2 w-64 bg-slate-950/95 border border-white/15 rounded-2xl shadow-2xl p-3 z-50 backdrop-blur-xl text-left"
                            >
                               <span className="text-[9px] text-[#9fb0d0]/40 font-bold px-2.5 py-1 block border-b border-white/5 mb-2">Secure Sessions</span>
                               <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-0.5 custom-scrollbar mb-2">
                                  {allAccounts.map(acc => {
                                     const isActive = acc.username.toLowerCase() === currentUser.username.toLowerCase();
                                     return (
                                        <div 
                                           key={acc.username}
                                           onClick={() => handleSwitchAccount(acc)}
                                           className={`flex items-center justify-between p-2 rounded-[16px] cursor-pointer transition-all ${isActive ? 'bg-blue-600/10 border border-blue-500/25 text-blue-300' : 'hover:bg-white/5 border border-transparent text-slate-300'}`}
                                        >
                                           <div className="flex items-center gap-2 min-w-0 pr-2 rounded-[16px]">
                                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${isActive ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-slate-400'}`}>
                                                 {acc.username.charAt(0).toUpperCase()}
                                              </div>
                                              <div className="flex flex-col min-w-0">
                                                 <span className="text-xs font-semibold truncate max-w-[130px]">{acc.username}</span>
                                                 {acc.isITAdmin && <span className="text-[8px] text-blue-400 font-bold mt-0.5">Admin</span>}
                                              </div>
                                           </div>
                                           <div className="flex items-center gap-1">
                                              {isActive && (
                                                 <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                              )}
                                              <button 
                                                 onClick={(e) => handleRemoveAccount(acc.username, e)}
                                                 className="p-1 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                 title="Sign out of this account"
                                              >
                                                 <X className="w-3.5 h-3.5" />
                                              </button>
                                           </div>
                                        </div>
                                     );
                                  })}
                               </div>
                               
                               <div className="border-t border-white/5 pt-2 mt-1 flex flex-col gap-1">
                                  <button 
                                     onClick={() => {
                                        setCurrentUser(null);
                                        setMode('login');
                                        setShowAccountDropdown(false);
                                     }}
                                     className="w-full px-2.5 py-2 hover:bg-white/5 rounded-[16px] text-xs font-bold text-blue-400 flex items-center gap-2 transition-all hover:text-blue-300"
                                  >
                                     <Plus className="w-3.5 h-3.5" /> Add Secure Account
                                  </button>
                                  <button 
                                     onClick={() => {
                                        setAllAccounts([]);
                                        setCurrentUser(null);
                                        localStorage.removeItem('hmail_accounts_list');
                                        localStorage.removeItem('hmail_current_user');
                                        localStorage.removeItem('hmail_last_used_time');
                                        setMode('login');
                                        setShowAccountDropdown(false);
                                     }}
                                     className="w-full px-2.5 py-2 hover:bg-red-500/10 rounded-[16px] text-xs font-bold text-red-500/95 flex items-center gap-2 transition-all hover:text-red-350"
                                  >
                                     <LogOut className="w-3.5 h-3.5" /> Log out of all
                                  </button>
                               </div>
                            </motion.div>
                         </>
                      )}
                    </AnimatePresence>
                 </div>
             </div>
          </motion.header>

          <div className="flex-1 flex flex-col lg:flex-row gap-6 items-stretch min-h-[600px]">
             
             {/* Left Column Sidebar */}
             <div className="w-full lg:w-64 flex flex-col gap-4">
                
                {/* Compose Action Buttons */}
                <button onClick={() => { setMode('compose'); setErrorMsg(""); setShowSettingsTray(false); }} className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-sm border border-white/5 text-white font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 text-center group">
                   <Edit3 className="w-4 h-4 group-hover:rotate-12 transition-transform" /> Compose Message
                </button>

                {currentUser.isITAdmin && (
                   <button onClick={() => { setMode('create_user'); setErrorMsg(""); setShowSettingsTray(false); }} className={`w-full py-3 border text-xs font-bold rounded-[16px] flex items-center justify-center gap-2 transition-all ${mode === 'create_user' ? 'bg-purple-600/30 border-purple-500 text-purple-300' : 'bg-purple-600/20 border-purple-500/30 text-purple-400 hover:bg-purple-600/40 hover:text-purple-300'}`}>
                      <User className="w-3.5 h-3.5" /> Managed Accounts
                   </button>
                )}

                 <button onClick={() => { setMode('sso' as any); setErrorMsg(""); setShowSettingsTray(false); }} className={`w-full py-3 border text-xs font-bold rounded-[16px] flex items-center justify-center gap-2 transition-all ${mode === 'sso' as any ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]' : 'bg-slate-900/40 border-white/10 text-slate-400 hover:bg-slate-900/60 hover:text-white'}`}>
                    <Code className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> SSO Developer Hub
                 </button>

                {/* Secure Folders Selector panel */}
                <nav className="p-4 bg-slate-900/60 border border-white/10 rounded-2xl flex flex-col gap-1.5 list-none">
                   <span className="text-[10px] text-[#9fb0d0]/40 font-bold px-2 mb-2 block">Secure Folders</span>
                   {listFolders.map(folder => {
                      const Icon = folder.icon;
                      const active = activeFolder === folder.id && mode === 'inbox' && !showSettingsTray;
                      const badge = getBadgeCount(folder.id);
                      return (
                         <button key={folder.id} onClick={() => { setActiveFolder(folder.id); setMode('inbox'); setShowSettingsTray(false); }} className={`w-full px-3 py-2.5 rounded-[16px] text-xs font-semibold flex items-center justify-between transition-all leading-none ${active ? 'bg-blue-600/20 border border-blue-500/30 text-blue-300' : 'text-[#9fb0d0]/80 hover:bg-white/5 border border-transparent'}`}>
                            <div className="flex items-center gap-2">
                               <Icon className={`w-4 h-4 ${folder.color}`} /> {folder.label}
                            </div>
                            {badge > 0 && (
                               <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 font-mono text-[10px] rounded-md font-bold">
                                  {badge}
                               </span>
                            )}
                         </button>
                      );
                   })}
                </nav>

                <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl flex flex-col gap-1.5 text-xs text-[#9fb0d0]/60 space-y-1">
                   <span className="text-[10px] text-[#9fb0d0]/40 font-bold block">System Privacy</span>
                   <div className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-blue-400" /> AES-256 Protocol</div>
                   <div className="flex items-center gap-2"><Lock className="w-3.5 h-3.5 text-green-400" /> Zero-Trust Gateway</div>
                </div>

             </div>

             {/* Right Main Panel Body */}
             <div className="flex-1 liquid-glass flex flex-col overflow-hidden bg-slate-900/60 border border-white/10 rounded-3xl min-h-[500px]">
                
                {/* 1. Global Preferences Settings Tray */}
                {showSettingsTray ? (
                   <div className="p-6 flex flex-col h-full z-10 w-full relative">
                      <div className="flex items-center justify-between mb-6">
                         <h2 className="text-lg font-bold text-white flex items-center gap-2"><Settings className="w-5 h-5 text-blue-400" /> Profile & Inbox Configuration</h2>
                         <button onClick={() => setShowSettingsTray(false)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[16px] text-xs text-[#9fb0d0] font-bold">Close Settings</button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[500px] pr-2 scrollbar-thin">
                         
                         {/* Out Of Office Block */}
                         <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                               <span className="font-bold text-sm text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-blue-400" /> Out-of-Office Assistant</span>
                               <label className="relative inline-flex items-center cursor-pointer">
                                  <input type="checkbox" checked={oooEnabled} onChange={e => handleSaveOooSettings(e.target.checked, oooText)} className="sr-only peer" />
                                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                               </label>
                            </div>
                            <p className="text-xs text-[#9fb0d0]/60">Automatically replies to anyone who emails you during active sessions.</p>
                            <textarea value={oooText} onChange={e => handleSaveOooSettings(oooEnabled, e.target.value)} className="w-full bg-black/40 border border-white/10 px-3 py-2 rounded-[16px] text-white outline-none focus:border-blue-400/50 resize-none text-xs h-24" placeholder="Enter custom message..."></textarea>
                         </div>

                         {/* Custom Personal Email Signatures block */}
                         <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                               <span className="font-bold text-sm text-white flex items-center gap-2"><FileText className="w-4 h-4 text-purple-400" /> Professional Signature</span>
                               <label className="relative inline-flex items-center cursor-pointer">
                                  <input type="checkbox" checked={signatureEnabled} onChange={e => handleToggleSignature(e.target.checked)} className="sr-only peer" />
                                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                               </label>
                            </div>
                            <p className="text-xs text-[#9fb0d0]/60">Rich-text footer automatically appended to composed new messages.</p>
                            <textarea value={signatureText} onChange={e => handleSaveSignature(e.target.value)} className="w-full bg-black/40 border border-white/10 px-3 py-2 rounded-[16px] text-white outline-none focus:border-blue-400/50 resize-none text-xs h-24 font-mono" placeholder="Regards, Alex Admin | IT Lead"></textarea>
                            <div className="text-[10px] text-right font-mono text-[#9fb0d0]/40">{signatureText.length} characters</div>
                         </div>

                         {/* Smart Auto-Snoozing Configuration */}
                         {domainPolicy?.allowAutoSnooze !== false && (
                            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col gap-3 md:col-span-2">
                               <div className="flex items-center justify-between">
                                  <span className="font-bold text-sm text-white flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" /> Humanized Auto-Snoozing Rules</span>
                                  <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-mono uppercase font-bold text-amber-300">
                                     Workspace Smart Filtering
                                  </span>
                               </div>
                               <p className="text-xs text-[#9fb0d0]/65 leading-relaxed">
                                  When activated, H Mail dynamically pauses nighttime alerts during sleep ranges and places mails containing subject keywords in a quiet queues stack.
                                </p>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="flex flex-col gap-1.5">
                                     <span className="text-xs text-white/70 font-semibold">Night Time Snooze Rule:</span>
                                     <select className="bg-slate-950/80 border border-white/10 px-3 py-2 rounded-[16px] text-white outline-none focus:border-amber-500/50 text-xs text-slate-200">
                                        <option value="enabled">Quiet Sleep Mode (8 PM - 7 AM Local Time)</option>
                                        <option value="disabled">Aggressive Delivery (Deliver 24/7 immediately)</option>
                                     </select>
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                     <span className="text-xs text-white/70 font-semibold">Keywords to Instantly Auto-Snooze:</span>
                                     <input type="text" placeholder="e.g. newsletter, promo, advertising, spam" className="bg-slate-950/80 border border-white/10 px-3 py-2 rounded-[16px] text-white outline-none focus:border-amber-500/50 text-xs text-slate-200" />
                                  </div>
                               </div>
                            </div>
                         )}

                         {/* Real-world SMTP Gateway Settings block */}
                         <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col gap-3 md:col-span-2">
                            <div className="flex items-center justify-between">
                               <span className="font-bold text-sm text-white flex items-center gap-2 pb-0.5"><Globe className="w-4 h-4 text-emerald-400" /> Real-world Delivery Gateway (Resend)</span>
                               <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono uppercase font-bold">
                                  Optional SMTP Relay
                               </span>
                            </div>
                            <p className="text-xs text-[#9fb0d0]/60 leading-relaxed">
                               H Mail is sandboxed inside Firestore by default. To make emails actually deliver to true inboxes (like your personal Gmail account), enter a free API Key from <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-bold">resend.com</a>.
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="flex flex-col gap-1.5">
                                  <label className="text-xs text-white/70 font-semibold font-mono">Resend API Key:</label>
                                  <input 
                                     type="password" 
                                     value={resendApiKey} 
                                     onChange={e => handleSaveResendSettings(e.target.value, useOnboardingDomain, customSenderEmail)} 
                                     className="w-full bg-slate-950/80 border border-white/10 px-3 py-2.5 rounded-[16px] text-white outline-none focus:border-emerald-500/50 text-xs font-mono transition-colors" 
                                     placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx" 
                                  />
                                </div>
                               
                               <div className="flex flex-col gap-1.5">
                                  <label className="text-xs text-white/70 font-semibold">Sender Email Address:</label>
                                  <div className="flex flex-col gap-2">
                                     {useOnboardingDomain ? (
                                        <div className="bg-slate-950/80 border border-white/10 px-3 py-1 rounded-[16px] text-[#9fb0d0]/60 text-xs flex items-center justify-between min-h-[38px] px-3">
                                           <span>onboarding@resend.dev <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded font-mono text-white/40 ml-1">Default Onboarding</span></span>
                                           <button 
                                              type="button" 
                                              onClick={() => handleSaveResendSettings(resendApiKey, false, 'me@mycompany.com')} 
                                              className="text-blue-400 hover:text-blue-300 font-bold text-[10px] uppercase py-1 px-2.5 bg-blue-500/10 hover:bg-blue-500/20 rounded border border-blue-500/20 transition-all cursor-pointer"
                                           >
                                              Use Custom
                                           </button>
                                        </div>
                                     ) : (
                                        <div className="flex gap-2">
                                           <input 
                                              type="text" 
                                              value={customSenderEmail} 
                                              onChange={e => handleSaveResendSettings(resendApiKey, false, e.target.value)} 
                                              className="flex-1 bg-slate-950/80 border border-white/10 px-3 py-2 rounded-[16px] text-white outline-none focus:border-emerald-500/50 text-xs transition-colors" 
                                              placeholder="sender@yourdomain.com" 
                                           />
                                           <button 
                                              type="button" 
                                              onClick={() => handleSaveResendSettings(resendApiKey, true, 'onboarding@resend.dev')} 
                                              className="text-amber-400 hover:text-amber-300 font-bold text-[10px] uppercase px-2.5 bg-amber-500/10 hover:bg-amber-500/20 rounded border border-amber-500/20 transition-all cursor-pointer whitespace-nowrap"
                                           >
                                              Reset Default
                                           </button>
                                        </div>
                                     )}
                                  </div>
                               </div>
                            </div>
                            
                            <div className="text-[10px] text-[#9fb0d0]/50 font-mono leading-relaxed bg-black/20 p-3 rounded-[16px] border border-white/5 space-y-1">
                               <span className="font-bold text-amber-400 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Quick Onboarding Guideline:</span> 
                               <div>• Unless you have added a verified domain to Resend, please set the sender to <strong>onboarding@resend.dev</strong>.</div>
                               <div>• Free accounts can only deliver physical emails to the single email verified on your Resend profile (usually your login email).</div>
                            </div>
                         </div>

                         {/* Custom Blocklist management settings block */}
                         <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col gap-3 md:col-span-2">
                            <span className="font-bold text-sm text-white flex items-center gap-2"><Ban className="w-4 h-4 text-rose-400" /> Standard Sender Blocklist</span>
                            <p className="text-xs text-[#9fb0d0]/60">Emails from blacklisted addresses bypass notifications and deposit silently to Trash.</p>
                            
                            <form onSubmit={handleAddBlockedUser} className="flex gap-2">
                               <input type="text" value={newBlockedEmail} onChange={e => setNewBlockedEmail(e.target.value)} className="flex-1 bg-black/40 border border-white/10 px-3 py-2 rounded-[16px] text-white outline-none focus:border-blue-400/50 text-xs" placeholder="Add email to block, e.g. spammer@scamdomain.com" />
                               <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-[16px] text-xs tracking-wider flex items-center gap-1 transition-colors"><Plus className="w-3.5 h-3.5" /> Block</button>
                            </form>

                            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                               {blockedSenders.length === 0 ? (
                                  <div className="text-xs text-[#9fb0d0]/40 py-2">No addresses blacklisted yet.</div>
                               ) : (
                                  blockedSenders.map(email => (
                                     <div key={email} className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-mono flex items-center gap-2">
                                        <span>{email}</span>
                                        <button type="button" onClick={() => handleRemoveBlockedUser(email)} className="hover:text-white transition-colors text-rose-300 font-bold font-sans">&times;</button>
                                     </div>
                                  ))
                               )}
                            </div>
                         </div>

                      </div>
                   </div>
                ) : mode === 'inbox' ? (
                   <div className="p-6 flex flex-col h-full z-10 w-full relative">
                      
                      {/* Top list header directory title */}
                      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                         <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-white capitalize flex items-center gap-2">
                               {activeFolder === 'inbox' ? 'Active Inbox' : activeFolder === 'starred' ? 'Starred Log' : activeFolder === 'sent' ? 'Sent Dir' : activeFolder}
                            </h2>
                            <span className="text-xs text-[#9fb0d0]/60 font-mono">({filteredMessages.length} messages)</span>
                         </div>
                         
                         {/* Quick search and filter block */}
                         <div className="flex items-center gap-2 flex-1 md:max-w-md">
                            <div className="relative flex-1">
                               <Search className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                               <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search mail... (Try sender:alex, is:starred)" className="w-full bg-black/40 border border-white/10 pl-10 pr-8 py-2 rounded-[16px] text-white text-xs outline-none focus:border-blue-400/50 transition-colors" />
                               {searchQuery && (
                                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9fb0d0] hover:text-white text-sm font-bold">&times;</button>
                               )}
                            </div>
                            <button onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')} className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[16px] text-xs text-[#9fb0d0] flex items-center gap-1 font-mono hover:text-white transition-all whitespace-nowrap" title="Toggle sorting flow">
                               <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" /> {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
                            </button>
                         </div>
                      </div>

                      {/* 2. Inbox Categorizations and Filter Tabs (Renders ONLY inside Inbox folder) */}
                      {activeFolder === 'inbox' && (
                         <div className="flex border-b border-white/10 mb-5 gap-1.5 overflow-x-auto pr-1">
                            {[
                               { id: 'primary', label: 'Primary Inbox', desc: 'Secure correspondence', color: 'border-blue-500 text-blue-400' },
                               { id: 'social', label: 'Social Updates', desc: 'Alerts & updates', color: 'border-purple-500 text-purple-400' },
                               { id: 'updates', label: 'Updates Feed', desc: 'Receipts, alerts', color: 'border-emerald-500 text-emerald-400' },
                               { id: 'forums', label: 'Forums & Teams', desc: 'Workspace groups', color: 'border-amber-500 text-amber-400' },
                            ].map(cat => {
                               const isActive = activeCategory === cat.id;
                               const count = messages.filter(m => getMessageFolder(m) === 'inbox' && getMessageCategory(m) === cat.id && !m.isRead).length;
                               return (
                                  <button key={cat.id} onClick={() => { setActiveCategory(cat.id as any); setExpandedId(null); }} className={`px-4 py-2 flex flex-col gap-0.5 border-b-2 text-left min-w-[130px] whitespace-nowrap transition-all ${isActive ? `${cat.color} bg-white/5` : 'border-transparent text-[#9fb0d0]/60 hover:text-white'}`}>
                                     <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-bold font-sans tracking-wide">{cat.label}</span>
                                        {count > 0 && <span className="p-0.5 px-1.5 bg-blue-500/20 text-blue-300 rounded font-mono text-[9px] font-bold">{count}</span>}
                                     </div>
                                     <span className="text-[10px] text-[#9fb0d0]/40 font-semibold">{cat.desc}</span>
                                  </button>
                               );
                            })}
                         </div>
                      )}

                      {/* 3. Bulk & Batch Utility Actions panel */}
                      {filteredMessages.length > 0 && (
                         <div className="flex items-center justify-between p-2.5 bg-white/[0.03] border border-white/10 rounded-[16px] mb-4 text-xs select-none">
                            <div className="flex items-center gap-3">
                               <button onClick={() => handleToggleSelectAll(filteredMessages)} className="text-[#9fb0d0]/80 hover:text-white transition-colors flex items-center gap-1.5">
                                  {selectedIds.length === filteredMessages.length ? <CheckSquare className="w-4 h-4 text-blue-400" /> : <Square className="w-4 h-4" />}
                                  <span>{selectedIds.length === 0 ? "Select All" : `Selected ${selectedIds.length}`}</span>
                               </button>

                               {selectedIds.length > 0 && (
                                  <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
                                     <button onClick={() => handleBulkTrash(filteredMessages)} className="p-1 px-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg font-bold flex items-center gap-1 transition-all"><Trash className="w-3.5 h-3.5" /> Trash</button>
                                     <button onClick={() => handleBulkArchive(filteredMessages)} className="p-1 px-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg font-bold flex items-center gap-1 transition-all"><Archive className="w-3.5 h-3.5" /> Archive</button>
                                     <button onClick={() => handleBulkMarkRead(filteredMessages)} className="p-1 px-2.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg font-bold flex items-center gap-1 transition-all"><Check className="w-3.5 h-3.5" /> Mark Read</button>
                                  </div>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                               <button onClick={() => handleGlobalMarkAllRead(filteredMessages)} className="text-blue-400/90 font-bold hover:text-blue-300 transition-colors" title="Mark all messages inside this layout as read">Mark All Read</button>
                               {activeFolder === 'trash' && (
                                  <button onClick={handleEmptyTrash} className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-lg font-bold transition-all flex items-center gap-1">Empty Trash bin</button>
                               )}
                            </div>
                         </div>
                      )}

                      {/* Main Message Flow Listing Cards */}
                      <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/10">
                         {filteredMessages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-[#9fb0d0]/40 opacity-70 py-16">
                               <Mail className="w-12 h-12 mb-3 text-blue-500/40" />
                               <p className="text-sm font-semibold">No messages details tracked here.</p>
                               {searchQuery && <p className="text-xs text-[#9fb0d0]/40 mt-1">Try broadening your search criteria.</p>}
                            </div>
                         ) : (
                            filteredMessages.map(msg => {
                               const isExpanded = expandedId === msg.id;
                               const isMsgStarred = !!msg.isStarred;
                               const isMsgRead = !!msg.isRead;
                               const isSelected = selectedIds.includes(msg.id);
                               
                               // Interactive priority values styling
                               const priorityGlow = msg.priority === 'high' ? 'border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.15)] bg-red-950/25' : msg.priority === 'medium' ? 'border-amber-500/30 bg-amber-950/15' : 'border-white/10 hover:border-white/20 bg-white/5';

                               // Dynamic read time estimation
                               const wordCount = (msg.body || "").split(/\s+/).filter(Boolean).length;
                               const readTime = Math.max(1, Math.round(wordCount / 180));

                               // Hex checksum E2EE hash
                               const bodyHash = CryptoJS.SHA1(msg.body || "").toString().substring(0, 10).toUpperCase();

                               return (
                                  <div key={msg.id} className={`p-4 border rounded-2xl flex flex-col gap-2 hover:bg-slate-900/50 transition-all duration-300 group shadow-md ${priorityGlow} ${!isMsgRead ? 'border-l-blue-500 border-l-4' : ''}`}>
                                     
                                     {/* Row Header Info */}
                                     <div className="flex items-start gap-3">
                                        <div className="flex items-center gap-1.5 mt-1 select-none">
                                           <button onClick={() => handleToggleSelectRow(msg.id)} className="text-[#9fb0d0]/50 hover:text-white transition-colors">
                                              {isSelected ? <CheckSquare className="w-4 h-4 text-blue-400" /> : <Square className="w-4 h-4" />}
                                           </button>
                                           <button onClick={() => handleUpdateMessageField(msg.id, 'isStarred', !isMsgStarred)} className={`transition-all ${isMsgStarred ? 'text-yellow-400 scale-110' : 'text-[#9fb0d0]/40 group-hover:text-amber-500/60'}`}>
                                              <Star className="w-4 h-4" />
                                           </button>
                                        </div>

                                        <div className="flex-1 flex flex-col md:flex-row justify-between items-start gap-2">
                                           <div onClick={() => handleExpandMessage(msg.id, !isMsgRead)} className="flex flex-col cursor-pointer flex-1">
                                              
                                              {/* Row Subtitle details badges */}
                                              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                                 <span className={`text-sm font-bold tracking-tight ${!isMsgRead ? 'text-white' : 'text-[#9fb0d0]/80'}`}>{msg.subject || 'No Subject'}</span>
                                                 {msg.priority === 'high' && (
                                                    <span className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-bold animate-pulse flex items-center gap-1 leading-none"><AlertTriangle className="w-2.5 h-2.5" /> High priority</span>
                                                 )}
                                                 {msg.priority === 'medium' && (
                                                    <span className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold leading-none">Medium priority</span>
                                                 )}
                                                 {msg.isMuted && (
                                                    <span className="text-[9px] bg-slate-800 text-[#9fb0d0]/50 border border-white/5 px-1.5 py-0.5 rounded font-bold leading-none">Muted Thread</span>
                                                 )}
                                              </div>

                                              <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#9fb0d0]/50">
                                                 <span>From: <span className="font-mono text-blue-300 font-medium">{msg.from || 'Anonymous'}</span></span>
                                                 <span>&bull;</span>
                                                 <span>To: <span className="font-mono text-purple-300">{msg.to || 'All Users'}</span></span>
                                              </div>
                                           </div>

                                           {/* Time badge details with icons */}
                                           <div className="flex items-center gap-3">
                                              <span className="text-[10px] text-[#9fb0d0]/40 font-mono flex items-center gap-1.5 whitespace-nowrap">
                                                 <span>⏱️ {readTime} min read</span>
                                                 <span>&bull;</span>
                                                 <span>{msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleString() : 'Just Now'}</span>
                                              </span>
                                              <div className="flex items-center gap-1.5">
                                                 {activeFolder === 'drafts' ? (
                                                    <button onClick={() => handleLoadDraft(msg)} className="p-1 px-2.5 bg-primary hover:bg-primary/80 backdrop-blur-md text-white font-bold rounded-lg text-[10px] flex items-center gap-1 transition-all"><Edit3 className="w-3 h-3" /> Edit Draft</button>
                                                 ) : (
                                                    <button onClick={() => handleExpandMessage(msg.id, !isMsgRead)} className="p-1.5 bg-white/5 border border-white/10 group-hover:border-blue-500/30 text-[#9fb0d0] hover:text-white rounded-lg transition-colors" title="Toggle full message pane">
                                                       {isExpanded ? <ChevronDown className="w-3.5 h-3.5 rotate-180 transition-transform" /> : <ChevronDown className="w-3.5 h-3.5 transition-transform" />}
                                                    </button>
                                                 )}
                                                 <button onClick={() => handleDeleteMessage(msg.id)} className="text-red-400 p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-all" title="Wipe message folder"><Trash2 className="w-3.5 h-3.5" /></button>
                                              </div>
                                           </div>
                                        </div>
                                     </div>

                                     {/* 4. Reading details fully expanded panel */}
                                     {isExpanded && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-4">
                                           
                                           {/* Security shield signature key indicators */}
                                           <div className="flex flex-wrap items-center justify-between p-2.5 bg-slate-950/50 border border-white/5 rounded-[16px] text-xs gap-3 font-mono">
                                              <div className="flex items-center gap-2 text-[#9fb0d0]/60 text-[10px]">
                                                 <Shield className="w-4 h-4 text-green-400 flex-shrink-0" />
                                                 <span>E2EE SHA-Hashed Integrity Validated</span>
                                              </div>
                                              <div className="text-[10px] text-blue-400 flex items-center gap-1.5">
                                                 <Lock className="w-3 h-3" /> Integrity Key: <span className="bg-slate-800 px-1 py-0.5 rounded text-white text-[9px]">{bodyHash}</span>
                                              </div>
                                           </div>

                                           <div className="text-sm text-[#9fb0d0] leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-blue-500/30 font-medium">
                                              {msg.body}
                                           </div>

                                           {/* Suggested Instant Replies actions */}
                                           {msg.from !== currentUser.username && (
                                              <div className="flex flex-col gap-2 mt-2">
                                                 <span className="text-[10px] uppercase text-[#9fb0d0]/40 tracking-wider font-bold">Suggested Instant Feedback replies:</span>
                                                 <div className="flex flex-wrap gap-2">
                                                    {quickTemplateReplies.map(reply => (
                                                       <button key={reply} onClick={() => {
                                                          setComposeTo(msg.from);
                                                          setComposeSubject(`Re: ${msg.subject || 'H Mail thread'}`);
                                                          setComposeBody(`> ${msg.body?.substring(0, 100)}...\n\n${reply}`);
                                                          setMode('compose');
                                                       }} className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-300 font-semibold rounded-[16px] text-xs tracking-wide transition-all text-left">
                                                          {reply}
                                                       </button>
                                                    ))}
                                                 </div>
                                              </div>
                                           )}

                                           {/* Message Action Controls: Mark read/Mute/Reply/Forward/Export */}
                                           <div className="flex flex-wrap gap-2 justify-end mt-4 pt-3 border-t border-white/5">
                                              {msg.from !== currentUser.username && (
                                                 <>
                                                    <button onClick={() => {
                                                       setComposeTo(msg.from);
                                                       setComposeSubject(`Re: ${msg.subject || 'Subject'}`);
                                                       setComposeBody(`\n\nOn ${msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleString() : 'N/A'}, ${msg.from} wrote:\n> ${msg.body?.replace(/\n/g, '\n> ')}`);
                                                       setMode('compose');
                                                    }} className="px-3 py-1.5 border border-white/10 hover:border-blue-500/30 text-xs font-bold text-[#9fb0d0] hover:text-white rounded-lg flex items-center gap-1.5 transition-all"><CornerUpLeft className="w-3.5 h-3.5" /> Reply Thread</button>
                                                    
                                                    <button onClick={() => {
                                                       setComposeTo('');
                                                       setComposeSubject(`Fwd: ${msg.subject || 'Subject'}`);
                                                       setComposeBody(`\n\n---------- Forwarded Message ----------\nFrom: ${msg.from}\nDate: ${msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleString() : 'N/A'}\nSubject: ${msg.subject}\nTo: ${msg.to}\n\n${msg.body}`);
                                                       setMode('compose');
                                                    }} className="px-3 py-1.5 border border-white/10 hover:border-blue-500/30 text-xs font-bold text-[#9fb0d0] hover:text-white rounded-lg flex items-center gap-1.5 transition-all"><Forward className="w-3.5 h-3.5" /> Forward Email</button>
                                                 </>
                                              )}
                                              
                                              <button onClick={() => handleUpdateMessageField(msg.id, 'isRead', !isMsgRead)} className="px-3 py-1.5 border border-white/10 text-xs font-bold text-[#9fb0d0] hover:text-white rounded-lg flex items-center gap-1.5 transition-all">
                                                 {isMsgRead ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                 {isMsgRead ? 'Mark Unread' : 'Mark Read'}
                                              </button>

                                              <button onClick={() => handleUpdateMessageField(msg.id, 'isMuted', !msg.isMuted)} className="px-3 py-1.5 border border-white/10 text-xs font-bold text-[#9fb0d0] hover:text-white rounded-lg flex items-center gap-1.5 transition-all">
                                                 <Ban className="w-3.5 h-3.5" />
                                                 {msg.isMuted ? 'Unmute Thread' : 'Mute Thread'}
                                              </button>

                                              <button onClick={() => handleExportEmail(msg)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-[#9fb0d0] hover:text-white rounded-lg flex items-center gap-1.5 transition-all"><Download className="w-3.5 h-3.5" /> Export Text</button>
                                           </div>

                                        </motion.div>
                                     )}

                                  </div>
                               );
                            })
                         )}
                      </div>
                   </div>
                ) : mode === 'compose' ? (
                   <div className="p-6 flex flex-col h-full z-10 w-full relative">
                      <div className="flex items-center justify-between mb-6">
                         <div className="flex items-center gap-4">
                            <button onClick={() => setMode('inbox')} className="p-2 border border-white/10 bg-white/5 hover:bg-white/10 rounded-[16px] transition-all">
                               <ArrowLeft className="w-4 h-4 text-[#9fb0d0]" />
                            </button>
                            <h2 className="text-lg font-bold text-white">New Message Compose</h2>
                         </div>
                         <button onClick={handleSaveDraft} className="px-4 py-2 bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 transition-all font-bold text-xs text-purple-300 rounded-[16px] flex items-center gap-1.5"><Bookmark className="w-4 h-4" /> Save Draft Folder</button>
                      </div>
                      
                      <form onSubmit={handleSend} className="flex flex-col gap-4 flex-1">
                         <div>
                            <div className="flex items-center justify-between mb-1">
                               <label className="text-xs text-[#9fb0d0] font-bold block font-sans">To Recipient Address:</label>
                               {currentUser?.isITAdmin ? (
                                  <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                                     Personal & External Domains Routing Allowed (IT Admin)
                                  </span>
                               ) : (
                                  <span className="text-[10px] bg-blue-500/10 text-[#9fb0d0]/60 border border-white/5 px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                                     Internal Domain Only (except feedback)
                                  </span>
                               )}
                            </div>
                            <div className="flex">
                               <input value={composeTo} onChange={e => setComposeTo(e.target.value)} required type="text" className="flex-1 bg-black/40 border border-white/10 px-4 py-3 rounded-l-xl text-white outline-none focus:border-blue-400/50" placeholder="recipient" />
                               <div className="bg-white/5 border border-white/10 border-l-0 px-4 py-3 rounded-r-xl flex items-center text-[#9fb0d0]/50 font-mono text-xs max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">{composeTo.includes('@') ? 'full email' : (currentUser?.username.includes('@') ? '@' + currentUser.username.split('@')[1] : '@hmail.com')}</div>
                            </div>
                            {isExternalCompose && (
                               <div className="mt-2 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-[16px] flex items-start gap-2.5 text-xs text-amber-300">
                                  <Globe className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                                  <div className="flex-1 space-y-1">
                                     <p className="font-bold">🌐 Real-world Delivery Target Detected</p>
                                     <p className="text-[11px] text-[#9fb0d0]/80 leading-relaxed font-sans">
                                        You are emailing an external recipient: <span className="text-white underline font-mono text-xs">{composeTo}</span>.
                                        {resendApiKey ? (
                                           <span> H Mail will route this through physical SMTP gateway using your configured <strong>Resend API key</strong> with sender address <strong>{useOnboardingDomain ? 'onboarding@resend.dev' : customSenderEmail}</strong>.</span>
                                        ) : (
                                           <span> <strong>No Resend Key paired:</strong> This message will post to the local database, but cannot reach external networks. Open <strong>Inbox Settings</strong> to pair a free API key from <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-bold">Resend</a> to enable real-world delivery!</span>
                                        )}
                                     </p>
                                  </div>
                               </div>
                            )}
                         </div>
                         <div>
                            <label className="text-xs text-[#9fb0d0] font-bold mb-1 block">Subject Title:</label>
                            <input value={composeSubject} onChange={e => setComposeSubject(e.target.value)} required type="text" className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-[16px] text-white outline-none focus:border-blue-400/50 text-xs" placeholder="Subject..." />
                         </div>

                         {/* Inline Priority selector */}
                         <div>
                            <label className="text-xs text-[#9fb0d0] font-bold mb-1 block">Priority Level Badge:</label>
                            <div className="flex gap-2">
                               {[
                                  { id: 'low', label: 'Low priority', activeColor: 'bg-slate-800 border-white/20 text-[#9fb0d0]' },
                                  { id: 'medium', label: 'Medium priority', activeColor: 'bg-amber-600/30 border-amber-500/45 text-amber-300' },
                                  { id: 'high', label: 'High priority', activeColor: 'bg-red-600/30 border-red-500/45 text-red-300 animate-pulse' }
                               ].map(p => (
                                  <button key={p.id} type="button" onClick={() => setComposePriority(p.id as any)} className={`px-4 py-2 border rounded-[16px] text-xs font-bold transition-all ${composePriority === p.id ? p.activeColor : 'bg-black/20 border-white/5 text-[#9fb0d0]/50 hover:bg-black/40'}`}>
                                     {p.label}
                                  </button>
                               ))}
                            </div>
                         </div>

                         <div className="flex-1 flex flex-col">
                          {/* Advanced Secure Mailroom Options */}
                          <div className="bg-slate-900/40 border border-white/10 p-4 rounded-[16px] space-y-4 mb-4">
                             <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                <span className="text-xs font-bold text-white flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5 text-blue-400" /> Advanced Workspace Delivering</span>
                                <span className="text-[10px] text-[#9fb0d0]/50">Managed by enterprise policies</span>
                             </div>
                             
                             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {/* Custom Masquerading Alias */}
                                {domainPolicy?.allowCustomAliases !== false && (
                                   <div className="flex flex-col gap-1">
                                      <span className="text-[10px] uppercase font-bold text-[#9fb0d0]/75">Sending Sender Alias:</span>
                                      <input type="text" value={customAlias} onChange={e => setCustomAlias(e.target.value)} placeholder="e.g. CEO <ceo@yourcompany.com>" className="bg-black/40 border border-white/10 px-3 py-2 rounded-lg text-xs text-white outline-none focus:border-blue-400/40" />
                                   </div>
                                )}

                                {/* Confidential Self Destruct Timer */}
                                {domainPolicy?.allowConfidentialMode !== false && (
                                   <div className="flex flex-col gap-1">
                                      <span className="text-[10px] uppercase font-bold text-[#9fb0d0]/75">Self Destruct Duration:</span>
                                      <select value={selfDestructOption} onChange={e => setSelfDestructOption(Number(e.target.value))} className="bg-black/40 border border-white/10 px-3 py-2 rounded-lg text-xs text-white outline-none focus:border-blue-400/40">
                                         <option value={0}>Never Expire</option>
                                         <option value={60000}>1 Minute (Test Mode)</option>
                                         <option value={600000}>10 Minutes</option>
                                         <option value={3600000}>1 Hour</option>
                                         <option value={86400000}>1 Day</option>
                                      </select>
                                   </div>
                                )}

                                {/* Scheduled Delivery Delay option */}
                                {domainPolicy?.allowScheduledDispatch !== false && (
                                   <div className="flex flex-col gap-1">
                                      <span className="text-[10px] uppercase font-bold text-[#9fb0d0]/75">Scheduled Dispatch:</span>
                                      <select value={scheduledDelayOption} onChange={e => setScheduledDelayOption(Number(e.target.value))} className="bg-black/40 border border-white/10 px-3 py-2 rounded-lg text-xs text-white outline-none focus:border-blue-400/40">
                                         <option value={0}>Deliver Immediately</option>
                                         <option value={30000}>In 30 Seconds (Test)</option>
                                         <option value={300000}>In 5 Minutes</option>
                                         <option value={3600000}>In 1 Hour</option>
                                         <option value={86400000}>In 1 Day</option>
                                      </select>
                                   </div>
                                )}

                                {/* Client-Side PGP AES 256 Payload Encryption */}
                                {domainPolicy?.allowEmailEncryption !== false && (
                                   <div className="flex items-center justify-between bg-black/30 border border-white/5 px-3 py-2 rounded-lg">
                                      <span className="text-[10px] uppercase font-bold text-[#9fb0d0]/75 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-green-400" /> AES-256 Encrypt:</span>
                                      <button type="button" onClick={() => setEncryptCompose(!encryptCompose)} className={`px-2.5 py-1 rounded text-[9px] font-bold ${encryptCompose ? 'bg-green-600/30 text-green-300 border border-green-500/30' : 'bg-slate-800 text-slate-400 border border-white/5'}`}>
                                         {encryptCompose ? 'ACTIVE' : 'INACTIVE'}
                                      </button>
                                   </div>
                                )}

                                {/* Tracking Pixels double-check */}
                                {domainPolicy?.allowTrackingPixels !== false && (
                                   <div className="flex items-center justify-between bg-black/30 border border-white/5 px-3 py-2 rounded-lg">
                                      <span className="text-[10px] uppercase font-bold text-[#9fb0d0]/75 flex items-center gap-1"><Activity className="w-3.5 h-3.5 text-blue-400" /> H-Track Pixel:</span>
                                      <button type="button" onClick={() => setTrackingPixelActive(!trackingPixelActive)} className={`px-2.5 py-1 rounded text-[9px] font-bold ${trackingPixelActive ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30' : 'bg-slate-800 text-slate-400 border border-white/5'}`}>
                                         {trackingPixelActive ? 'ENABLED' : 'DISABLED'}
                                      </button>
                                   </div>
                                )}

                                {/* Tone Analyzer Assist Selection */}
                                {domainPolicy?.allowWriteToneAnalyzer !== false && (
                                   <div className="flex flex-col gap-1">
                                      <span className="text-[10px] uppercase font-bold text-[#9fb0d0]/75 flex items-center gap-1"><Wand2 className="w-3 h-3 text-purple-400" /> Tone Coach:</span>
                                      <select value={localToneSelection} onChange={e => {
                                         const val = e.target.value;
                                         setLocalToneSelection(val);
                                         if (val === 'none') {
                                            setSuggestedToneHelp('');
                                         } else if (val === 'corp') {
                                            setSuggestedToneHelp('💼 TIP: Use "Please discover attached" instead of "Here is". Maintain passive structure.');
                                         } else if (val === 'friendly') {
                                            setSuggestedToneHelp('🌸 TIP: Add an opening greeting like "Hope your week is shining!" and soft closures.');
                                         } else if (val === 'confident') {
                                            setSuggestedToneHelp('🎯 TIP: Use direct sentences: "We will release tomorrow" instead of "I believe we can".');
                                         }
                                      }} className="bg-black/40 border border-white/10 px-3 py-2 rounded-lg text-xs text-white outline-none focus:border-blue-400/40">
                                         <option value="none">No Tone Assistance</option>
                                         <option value="corp">Corporate / Executive</option>
                                         <option value="friendly">Warm & Empathetic</option>
                                         <option value="confident">Assertive & Laser-focused</option>
                                      </select>
                                   </div>
                                )}
                             </div>

                             {suggestedToneHelp && (
                                <div className="p-2 bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-300 rounded-lg flex items-center gap-1.5 font-sans leading-relaxed">
                                   <Wand2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                   <span>{suggestedToneHelp}</span>
                                </div>
                             )}

                             {/* Attachment Local Sandbox File Scanning Module */}
                             {domainPolicy?.allowAttachmentSandbox !== false && (
                                <div className="border border-white/5 bg-black/20 p-3 rounded-lg flex flex-col gap-2">
                                   <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-[#9fb0d0] flex items-center gap-1"><Paperclip className="w-3 h-3 text-cyan-400" /> ZIP Sandbox Scanner</span>
                                      <label className="cursor-pointer px-2 py-1 rounded bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-[9px] font-bold text-cyan-300 select-none transition-colors">
                                         + Attach Document
                                         <input type="file" onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            const newAttach = {
                                               name: file.name,
                                               size: `${Math.round(file.size / 1024)} KB`,
                                               securityStatus: 'analyzing' as any
                                            };
                                            setAttachmentFiles(prev => [...prev, newAttach]);
                                            
                                            // Simulate local security sandboxes checking
                                            setTimeout(() => {
                                               setAttachmentFiles(prev => prev.map(f => {
                                                  if (f.name === file.name) {
                                                     const isMalicious = file.name.endsWith('.exe') || file.name.endsWith('.bat') || file.name.toLowerCase().includes('virus');
                                                     return {
                                                        ...f,
                                                        securityStatus: isMalicious ? 'blocked' : 'clean'
                                                     };
                                                  }
                                                  return f;
                                               }));
                                            }, 1500);
                                         }} className="hidden" />
                                      </label>
                                   </div>

                                   {attachmentFiles.length > 0 ? (
                                      <div className="space-y-1.5 mt-1.5">
                                         {attachmentFiles.map((f, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5 text-xs">
                                               <span className="text-white font-mono break-all pr-2">{f.name} ({f.size})</span>
                                               <div className="flex items-center gap-2">
                                                  {f.securityStatus === 'analyzing' && <span className="text-[9px] tracking-wider uppercase font-bold text-yellow-400 animate-pulse flex items-center gap-1">⏱️ SANDBOX TESTING...</span>}
                                                  {f.securityStatus === 'clean' && <span className="text-[9px] tracking-wider uppercase font-bold text-green-400 flex items-center gap-1">✓ SECURE & SAFE</span>}
                                                  {f.securityStatus === 'blocked' && <span className="text-[9px] tracking-wider uppercase font-bold text-red-400 flex items-center gap-1">⚠ MALWARE BLOCKED</span>}
                                                  <button type="button" onClick={() => setAttachmentFiles(prev => prev.filter((_, i) => i !== idx))} className="text-[#9fb0d0]/50 hover:text-white transition-colors">✕</button>
                                               </div>
                                            </div>
                                         ))}
                                      </div>
                                   ) : (
                                      <div className="p-2 border border-dashed border-white/5 rounded text-center text-[10px] text-[#9fb0d0]/40 font-sans">
                                         Drag & drop ZIP/PDF documents or click attach above. Safe local secure parsing sandbox is engaged.
                                      </div>
                                   )}
                                </div>
                             )}
                          </div>

                            <label className="text-xs text-[#9fb0d0] font-bold mb-1 block">Message Body Content:</label>
                            <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} required className="w-full flex-1 bg-black/40 border border-white/10 px-4 py-3 rounded-[16px] text-white outline-none focus:border-blue-400/50 resize-none min-h-[160px] text-sm" placeholder="Write your message here..."></textarea>
                         </div>
                         
                         {errorMsg && <div className="text-red-400 text-sm mt-2">{errorMsg}</div>}
                         
                         <div className="mt-4 flex justify-between items-center">
                            <div className="text-xs font-mono text-[#9fb0d0]/50">
                               {signatureEnabled && signatureText.trim() ? "Note: Custom profile signature will be appended to email footer." : ""}
                            </div>
                            <button disabled={composingMsg} type="submit" className="px-6 py-3 bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 disabled:opacity-50 text-white font-bold rounded-[16px] text-sm flex items-center gap-2 transition-all shadow-sm border border-white/5">
                               <Send className="w-4 h-4" /> Send Message
                            </button>
                         </div>
                      </form>
                   </div>
                ) : mode === 'create_user' ? (
                  <div className="p-6 flex flex-col h-full z-10 w-full relative">
                     <div className="flex items-center gap-4 mb-6">
                        <button onClick={() => { setMode('inbox'); setErrorMsg(''); }} className="p-2 border border-white/10 bg-white/5 hover:bg-white/10 rounded-[16px] transition-all">
                           <ArrowLeft className="w-4 h-4 text-[#9fb0d0]" />
                        </button>
                        <h2 className="text-lg font-bold text-white">IT Admin Room - Manage Domain Accounts</h2>
                     </div>
                     
                     <div className="flex flex-col md:flex-row gap-8 flex-1 overflow-hidden">
                         <div className="w-full md:w-1/2 flex flex-col gap-6">
                             
                             {/* IT Domain policies toggle */}
                             <div className="bg-gradient-to-br from-purple-950/20 to-slate-900/60 p-5 rounded-2xl border border-purple-500/20 shadow-md">
                                 <h4 className="text-xs font-bold text-purple-400 mb-3 flex items-center gap-2">🛡️ Corporate IT Domain Policies Console</h4>
                                 <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-900/45">
                                    {[
                                       { key: 'allowExternalComm', title: 'External Domain Routing Rules', desc: 'Allows business domain users to send emails globally outside your tenant.' },
                                       { key: 'allowConfidentialMode', title: 'Confidential Expiry Timers', desc: 'Allows framing self-destruct durations on composed emails.' },
                                       { key: 'allowUndoSend', title: 'Undo Send Buffer Queue', desc: 'Allows delayed pipeline routing so users can recall emails.' },
                                       { key: 'allowEmailEncryption', title: 'AES-256 Payload Encryption', desc: 'Provides client-side encrypted messaging secure from database eyes.' },
                                       { key: 'allowAutoSnooze', title: 'Smart Auto-Snoozing Modules', desc: 'Enables automatic inbox silent snooze rules.' },
                                       { key: 'allowSignatureBuilder', title: 'Corporate Footer Footprints', desc: 'Enables professional HTML profile signature appendings.' },
                                       { key: 'allowWriteToneAnalyzer', title: 'Tone Analysis Assistant', desc: 'Ensures tone scanning of email drafting drafts locally.' },
                                       { key: 'allowScheduledDispatch', title: 'Scheduled Date Dispatcher', desc: 'Allows sending emails slated for automatic release at a future date.' },
                                       { key: 'allowAttachmentSandbox', title: 'Vulnerability Attachment Sandbox', desc: 'Runs zero-cost local zip and document payload scans.' },
                                       { key: 'allowTrackingPixels', title: 'H-Track Double Receipt Check', desc: 'Embeds safe read-tracking pixels in outgoing correspondence.' },
                                       { key: 'allowCustomAliases', title: 'Masquerading Sender Custom Aliases', desc: 'Allows custom profile alias aliases validation check routing.' }
                                    ].map(pol => {
                                       const isPolEnabled = domainPolicy ? (domainPolicy as any)[pol.key] !== false : true;
                                       return (
                                          <div key={pol.key} className="flex items-center justify-between gap-4 bg-black/30 p-2.5 rounded-[16px] border border-white/5 hover:border-white/10 transition-colors">
                                             <div className="flex flex-col gap-0.5 flex-1">
                                                <span className="text-[11px] font-bold text-white leading-normal">{pol.title}</span>
                                                <span className="text-[9px] text-[#9fb0d0]/60 leading-normal">{pol.desc}</span>
                                             </div>
                                             <button type="button" onClick={() => handleToggleDomainPolicy(pol.key)} className={`px-2 py-1 rounded-lg text-[8px] font-bold uppercase transition-all tracking-wider whitespace-nowrap border ${isPolEnabled ? 'bg-green-600/20 border-green-500/40 text-green-300' : 'bg-red-600/20 border-red-500/40 text-red-300'}`}>
                                                {isPolEnabled ? 'ALLOW' : 'RESTRICT'}
                                             </button>
                                          </div>
                                       );
                                    })}
                                 </div>
                             </div>

                             <div className="flex flex-col gap-3">
                                 <h3 className="text-xs font-bold text-white/50 pl-2">Create New Domain Account</h3>
                                 <form onSubmit={handleAdminCreateUser} className="flex flex-col gap-4 bg-white/5 p-6 rounded-2xl border border-white/10">
                                    {errorMsg && (
                                       <div className={`text-sm p-3 border rounded-[16px] text-center font-medium ${errorMsg.includes('successfully') || errorMsg.includes('Adjusted') ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                          {errorMsg}
                                       </div>
                                    )}
                                    <div>
                                       <label className="text-xs font-bold text-white/50 mb-2 pl-2 flex items-center gap-2"><User className="w-3 h-3" /> New Username</label>
                                       <div className="flex">
                                          <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="flex-1 bg-black/40 border border-white/10 px-4 py-3 rounded-l-xl text-white outline-none focus:border-blue-400/50 transition-colors" placeholder="username" />
                                          <div className="bg-white/5 border border-white/10 border-l-0 px-3 py-3 rounded-r-xl flex items-center text-[#9fb0d0]/50 font-mono text-sm max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">
                                              {currentUser.username.includes('@') ? '@' + currentUser.username.split('@')[1] : '@Hmail.com'}
                                          </div>
                                       </div>
                                    </div>
                                    <div>
                                       <label className="text-xs font-bold text-white/50 mb-2 pl-2 flex items-center gap-2"><Key className="w-3 h-3" /> Initial Password</label>
                                       <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-[16px] text-white outline-none focus:border-blue-400/50 transition-colors" placeholder="••••••••" />
                                    </div>
                                    <button type="submit" className="mt-2 w-full bg-primary hover:bg-primary/80 backdrop-blur-md text-white font-bold py-3 rounded-[16px] shadow-sm border border-white/5 transition-all text-sm flex items-center justify-center gap-2">
                                       <User className="w-4 h-4" /> Create Managed Account
                                    </button>
                                 </form>
                             </div>
                         </div>
                         
                         <div className="w-full md:w-1/2 flex flex-col flex-1">
                             <h3 className="text-xs font-bold text-white/50 mb-4 pl-2">Managed Domain Accounts ({managedUsers.length})</h3>
                             <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-white/10 max-h-[460px]">
                                 {managedUsers.length === 0 ? (
                                    <div className="p-4 bg-white/5 border border-white/10 rounded-[16px] text-center text-sm text-[#9fb0d0]/50">No accounts created yet.</div>
                                 ) : (
                                    managedUsers.map(user => (
                                       <div key={user.id} className="flex items-center justify-between p-3 bg-black/40 border border-white/10 rounded-[16px] hover:border-purple-500/30 transition-colors">
                                          <div className="flex flex-col">
                                             <span className="font-mono text-white text-sm">{user.username.includes('@') ? user.username : user.username + '@Hmail.com'}</span>
                                             <span className="text-[10px] text-[#9fb0d0]/60 mt-1">Created: {user.createdAt?.toDate ? new Date(user.createdAt.toDate()).toLocaleDateString() : 'N/A'}</span>
                                          </div>
                                          <button onClick={() => handleDeleteUser(user.username)} className="p-2 text-red-400 hover:bg-red-500/20 bg-red-500/10 rounded-lg transition-colors" title="Delete Account">
                                             <Trash2 className="w-4 h-4" />
                                          </button>
                                       </div>
                                    ))
                                 )}
                             </div>
                         </div>
                     </div>
                  </div>
                ) : (
                  /* mode === 'sso' Developer Hub Screen */
                  <div className="p-6 flex flex-col h-full z-10 w-full relative overflow-hidden">
                     <div className="flex items-center gap-4 mb-6">
                        <button onClick={() => { setMode('inbox'); setErrorMsg(''); }} className="p-2 border border-white/10 bg-white/5 hover:bg-white/10 rounded-[16px] transition-all">
                           <ArrowLeft className="w-4 h-4 text-[#9fb0d0]" />
                        </button>
                        <div>
                           <h2 className="text-lg font-bold text-white flex items-center gap-2">
                              <Code className="w-5 h-5 text-emerald-400 animate-pulse" /> Hmail Developer SSO Integration Portal
                           </h2>
                           <p className="text-xs text-[#9fb0d0]/60 mt-0.5">Plug-and-play code, direct credentials verifier, and real configurations for your brother's app.</p>
                        </div>
                     </div>

                     {/* One-Click SSO Control & Integration Settings */}
                     <div className="bg-gradient-to-r from-emerald-950/40 via-blue-950/30 to-slate-900/60 p-5 rounded-2xl border border-emerald-500/20 shadow-md mb-6 relative overflow-hidden backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-400/5 rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="flex flex-col gap-2">
                           <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1.5 leading-none">
                              <ShieldCheck className="w-3.5 h-3.5 animate-pulse" /> One-Click Access Gateway Control
                           </span>
                           <h3 className="text-sm font-bold text-white leading-tight">Authorize Companion Application Systems</h3>
                           <p className="text-xs text-[#9fb0d0]/60 max-w-xl font-sans">
                              Grant your brother's custom web application instant permission to authenticate users directly against Hmail registry. One single click enables secure cross-origin queries!
                           </p>
                           
                           <div className="flex flex-wrap gap-2 mt-2">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all select-none leading-none ${ssoGatewayEnabled ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-300'}`}>
                                 <span className={`w-1.5 h-1.5 rounded-full ${ssoGatewayEnabled ? 'bg-emerald-400 animate-ping' : 'bg-red-400'}`} />
                                 {ssoGatewayEnabled ? "SSO GATEWAY ACTIVE" : "SSO GATEWAY PAUSED"}
                              </span>
                              
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all select-none leading-none ${brotherAppAuthorized ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400' : 'bg-white/5 border border-white/10 text-white/40'}`}>
                                 <span className={`w-1.5 h-1.5 rounded-full ${brotherAppAuthorized ? 'bg-blue-400 animate-ping' : 'bg-gray-500'}`} />
                                 {brotherAppAuthorized ? "BROTHER'S APP: GRANTED & ON" : "BROTHER'S APP: UNCONFIGURED"}
                              </span>
                           </div>
                        </div>

                        {/* Control Actions */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
                           <button
                              type="button"
                              disabled={ssoProcessing}
                              onClick={handleAuthorizeBrotherApp}
                              className={`px-4 py-2.5 rounded-[16px] text-xs font-bold cursor-pointer select-none transition-all flex items-center justify-center gap-2 border shadow-sm ${brotherAppAuthorized ? 'bg-emerald-600/20 hover:bg-emerald-500/30 border-emerald-500/40 text-emerald-300' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:shadow-[0_0_12px_rgba(59,130,246,0.3)] border-transparent text-white'}`}
                           >
                              {ssoProcessing ? (
                                 <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : brotherAppAuthorized ? (
                                 <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                 <Plus className="w-3.5 h-3.5 text-white" />
                              )}
                              {brotherAppAuthorized ? "Revoke Brother's App" : "Allow Brother's App"}
                           </button>

                           <button
                              type="button"
                              disabled={ssoProcessing}
                              onClick={handleToggleSsoGateway}
                              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-850 text-[#9fb0d0] hover:text-white border border-white/10 rounded-[16px] text-xs font-bold transition-all cursor-pointer select-none flex items-center justify-center gap-2"
                              title="Pause / Resume Gateway Connection"
                           >
                              <Globe className={`w-3.5 h-3.5 ${ssoGatewayEnabled ? 'text-emerald-400 animate-spin' : 'text-red-400'}`} style={{ animationDuration: '4s' }} />
                              {ssoGatewayEnabled ? "Pause Gateway" : "Start Gateway"}
                           </button>

                           <button
                              type="button"
                              onClick={handleDownloadSsoConfig}
                              className="px-3 py-2.5 bg-black/40 hover:bg-black/60 text-blue-300 hover:text-white border border-blue-500/20 hover:border-blue-500/40 rounded-[16px] text-xs font-bold transition-all cursor-pointer select-none"
                              title="Download hmail-sso-config.json Connection Bundle"
                           >
                              <Download className="w-3.5 h-3.5" />
                           </button>
                        </div>
                     </div>

                     {/* Companion Application URL Config */}
                     <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/10 shadow-md mb-6 relative overflow-hidden backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-col gap-1.5 max-w-xl">
                           <span className="text-[10px] text-blue-400 font-bold flex items-center gap-1.5 leading-none">
                              <Globe className="w-3.5 h-3.5 text-blue-400" /> Companion Application Origin URL
                           </span>
                           <h3 className="text-sm font-bold text-white">Target SSO Domain Reference</h3>
                           <p className="text-xs text-[#9fb0d0]/60 font-sans">
                              Specify your brother's custom web application URL (e.g., <code>https://brotherapp.domain.com</code>) to register allowed domains and bundle redirect configurations.
                           </p>
                        </div>
                        
                        <div className="flex items-center gap-2 w-full md:w-auto md:min-w-[320px] shrink-0">
                           <input
                              type="url"
                              placeholder="https://your-brother-app.com"
                              value={brotherAppUrl}
                              onChange={(e) => setBrotherAppUrl(e.target.value)}
                              className="flex-1 bg-black/40 border border-white/10 rounded-[16px] px-3.5 py-2.5 text-xs font-mono text-white placeholder-white/20 select-text outline-none focus:border-blue-500/50 transition-colors"
                           />
                           <button
                              type="button"
                              disabled={ssoProcessing}
                              onClick={() => handleUpdateBrotherAppUrl(brotherAppUrl)}
                              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 disabled:bg-blue-800 text-white font-bold rounded-[16px] text-xs transition-all shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 museum-btn"
                           >
                              {ssoProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Save URL"}
                           </button>
                        </div>
                     </div>

                     {/* Action Toast Notifications */}
                     {actionSuccessMessage && (
                        <div className="mb-4 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-[16px] text-emerald-300 font-sans text-xs flex items-center justify-between gap-2 shadow-sm">
                           <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                              <span className="font-semibold">{actionSuccessMessage}</span>
                           </div>
                           <button type="button" onClick={() => setActionSuccessMessage("")} className="text-emerald-400/40 hover:text-emerald-400 text-[10px] font-bold uppercase transition-all">Dismiss</button>
                        </div>
                     )}

                     <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                        {/* Left Side: Live Credentials Verifier Simulator */}
                        <div className="w-full lg:w-[42%] flex flex-col gap-5 bg-gradient-to-b from-slate-900/60 to-slate-950/40 p-5 rounded-2xl border border-white/10 shadow-lg min-h-[400px]">
                           <div>
                              <h3 className="text-sm font-bold text-white flex items-center gap-2 font-sans">
                                 <Activity className="w-4 h-4 text-emerald-400" /> SSO Credentials Verifier
                              </h3>
                              <p className="text-xs text-[#9fb0d0]/50 mt-1">Simulate live authentication requests directly against the <code>hmail_users</code> Firestore database.</p>
                           </div>

                           <form onSubmit={handleTestSsoLogin} className="flex flex-col gap-4 font-sans">
                              <div>
                                 <label className="text-[10px] font-bold text-white/50 mb-1.5 pl-1 block flex items-center gap-1">
                                    <User className="w-3 h-3 text-emerald-400" /> Hmail Username / Space ID
                                 </label>
                                 <input 
                                    type="text" 
                                    value={ssoTesterUsername} 
                                    onChange={e => setSsoTesterUsername(e.target.value)} 
                                    className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-[16px] text-white outline-none focus:border-emerald-500/50 text-xs font-mono transition-all" 
                                    placeholder="e.g. alex or name@hmail.com" 
                                    required
                                 />
                              </div>

                              <div>
                                 <label className="text-[10px] font-bold text-white/50 mb-1.5 pl-1 block flex items-center gap-1">
                                    <Key className="w-3 h-3 text-emerald-400" /> Account Private Password
                                 </label>
                                 <input 
                                    type="password" 
                                    value={ssoTesterPassword} 
                                    onChange={e => setSsoTesterPassword(e.target.value)} 
                                    className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-[16px] text-white outline-none focus:border-emerald-500/50 text-xs transition-all" 
                                    placeholder="••••••••" 
                                    required
                                 />
                              </div>

                              <button 
                                 type="submit" 
                                 disabled={ssoTesterLoading}
                                 className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-[16px] text-xs transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 cursor-pointer pt-3 pb-3"
                              >
                                 {ssoTesterLoading ? "Connecting Gateway..." : "Test Verifier Connection"}
                              </button>
                           </form>

                           {/* Verification Results Panel */}
                           {ssoTesterResult && (
                              <div className={`p-4 border rounded-[16px] text-xs flex flex-col gap-3 ${ssoTesterResult.success ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300" : "bg-red-500/5 border-red-500/20 text-red-300"}`}>
                                 <div className="flex items-center gap-2 font-bold select-none">
                                    {ssoTesterResult.success ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <Ban className="w-4 h-4 text-red-400" />}
                                    <span>{ssoTesterResult.message}</span>
                                 </div>

                                 {ssoTesterResult.success && ssoTesterResult.profile && (
                                    <div className="space-y-2 mt-1 pt-2 border-t border-white/5 font-mono text-[11px]">
                                       <div className="flex justify-between"><span className="text-[#9fb0d0]/50">INDEXED ID:</span> <span className="text-white">{ssoTesterResult.profile.username}</span></div>
                                       <div className="flex justify-between"><span className="text-[#9fb0d0]/50">ACCOUNT TYPE:</span> <span className="text-purple-300">{ssoTesterResult.profile.isITAdmin ? "TENANT IT ADMIN" : "STANDARD ENTERPRISE"}</span></div>
                                       <div className="flex justify-between"><span className="text-[#9fb0d0]/50">CREATED AT:</span> <span>{ssoTesterResult.profile.createdAt}</span></div>
                                       
                                       <div className="flex flex-col gap-1 mt-2 font-sans font-medium">
                                          <span className="text-[#9fb0d0]/50 text-[10px] font-bold">SIMULATED SECURE JWT TOKEN:</span>
                                          <div className="bg-black/80 border border-white/5 p-2 rounded text-[10px] break-all max-h-24 overflow-y-auto text-emerald-400/90 font-mono select-all scrollbar-thin">
                                             {ssoTesterResult.token}
                                          </div>
                                       </div>
                                    </div>
                                 )}
                              </div>
                           )}
                        </div>

                        {/* Right Side: Copyable Integration Code with interactive tab switches */}
                        <div className="flex-1 flex flex-col gap-4 bg-white/[0.02] border border-white/10 p-5 rounded-2xl min-h-[400px]">
                           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/0 leading-relaxed pb-3">
                              <div>
                                 <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Terminal className="w-4 h-4 text-blue-400" /> Plug-and-Play SDK Scripts
                                 </h3>
                                 <p className="text-xs text-[#9fb0d0]/50 mt-1">Copy and paste these pre-configured code structures directly into your brother's app.</p>
                              </div>

                              {/* Copy Trigger */}
                              <button 
                                 type="button"
                                 onClick={() => {
                                    let copyStr = "";
                                    if (activeCodeTab === 'react') {
                                       copyStr = reactCodeSnippet;
                                    } else if (activeCodeTab === 'js') {
                                       copyStr = vanillaJsCodeSnippet;
                                    } else {
                                       copyStr = curlCodeSnippet;
                                    }
                                    navigator.clipboard.writeText(copyStr);
                                    setCopiedText(true);
                                    setTimeout(() => setCopiedText(false), 2000);
                                 }}
                                 className="px-3 py-1.5 bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 font-bold text-xs uppercase text-white rounded-lg flex items-center gap-1.5 shrink-0 transition-all cursor-pointer select-none border border-transparent hover:border-blue-400"
                              >
                                 <Save className="w-3.5 h-3.5" />
                                 {copiedText ? "COPIED!" : "COPY LIVE CODE"}
                              </button>
                           </div>

                           {/* Interactive Tab Headers */}
                           <div className="flex flex-wrap gap-2">
                              {[
                                 { id: 'react', label: 'React Hook Component (TS)' },
                                 { id: 'js', label: 'Vanilla HTML5 / JavaScript (ES6)' },
                                 { id: 'curl', label: 'Direct Firestore REST API' }
                              ].map(tab => (
                                 <button 
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveCodeTab(tab.id as any)}
                                    className={`px-3 py-2 border rounded-[16px] text-xs font-bold transition-all cursor-pointer ${activeCodeTab === tab.id ? 'bg-slate-800 border-white/20 text-blue-300' : 'bg-black/20 border-white/5 text-[#9fb0d0]/50 hover:bg-black/40'}`}
                                 >
                                    {tab.label}
                                 </button>
                              ))}
                           </div>

                           {/* Live Pre-Configured Snippet Render space */}
                           <div className="flex-1 flex flex-col gap-3 min-h-[250px] relative">
                              <pre className="flex-1 bg-black/50 border border-white/5 p-4 rounded-[16px] font-mono text-[11px] text-[#b8ccf3] overflow-x-auto max-h-[280px] overflow-y-auto whitespace-pre leading-relaxed select-all scrollbar-thin">
                                 {activeCodeTab === 'react' ? reactCodeSnippet : activeCodeTab === 'js' ? vanillaJsCodeSnippet : curlCodeSnippet}
                              </pre>

                              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-[16px] text-xs text-[#9fb0d0] leading-normal flex items-start gap-2">
                                 <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5 animate-pulse" />
                                 <div>
                                    <span className="font-bold text-white block mb-0.5 font-sans">ℹ️ Integration Architecture Note:</span>
                                    <span>This snippet contains your actual <strong>live database environment settings</strong>. It hashes passwords on the client-side to ensure SHA-256 integrity checks match the Hmail platform securely.</span>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
                )}

             </div>

          </div>

          <div className="mt-8">
             <PrivacyFooter />
          </div>

        </motion.div>
  );
}
