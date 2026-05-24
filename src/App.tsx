/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { 
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged, 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import CryptoJS from 'crypto-js';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteField,
  query, 
  where, 
  getDocs, 
  getDoc,
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  orderBy,
  limit,
  deleteDoc
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { encryptLocalData, decryptLocalData } from './lib/encryption';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, LayoutGrid, Eye, Copy, LogOut, Send, ShieldCheck, ShieldAlert, LogIn, Check, Lock, Mic, Square, Phone, PhoneOff, FileVideo, Video, VideoOff, Download, UserX, Clock, Database, Info, ShieldPlus, Settings, Sliders, Settings2, Activity, Zap, Terminal, Globe, Code, Key, Search, Wifi, MonitorUp, MonitorOff, VolumeX, Volume2, Mail, FileText, Cloud, ListTodo, ClipboardList, Trash2, UserMinus, X } from 'lucide-react';
import { HMailUI } from './HMailUI';
import HMeetUI from './HMeetUI';

// --- Error Handling ---
enum OperationType { CREATE = 'create', UPDATE = 'update', DELETE = 'delete', LIST = 'list', GET = 'get', WRITE = 'write' }
interface FirestoreErrorInfo { error: string; operationType: OperationType; path: string | null; authInfo: { userId?: string | null; email?: string | null; } }
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: { userId: auth.currentUser?.uid, email: auth.currentUser?.email },
    operationType, path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

interface Message { id: string; senderId: string; senderName: string; text: string; timestamp: any; }
interface Room { id: string; code: string; hostName: string; hostId: string; participants: Record<string, string>; participantIds?: string[]; isDirect?: boolean; banned?: Record<string, boolean>; typing?: Record<string, number>; status: 'waiting' | 'active' | 'closed'; }
interface SavedRoom { id: string; code: string; hostName: string; timestamp: number; }
interface Contact { uid: string; email: string; name: string; }

const ADMIN_FEATURES = [
  { id: 1, name: "Neural Network Traffic Analyzer", icon: Activity, desc: "Monitor encrypted packet flow in real-time." },
  { id: 2, name: "Quantum Encryption Override", icon: Key, desc: "Force regenerate PGP curves on the fly." },
  { id: 3, name: "Global Mute Protocol", icon: Mic, desc: "Silence all participants in target room." },
  { id: 4, name: "Deepfake Detection Overlay", icon: Video, desc: "AI anomaly detection for video streams." },
  { id: 5, name: "Geo-Spoofing Bypass", icon: Globe, desc: "Reveal true IP location of clients." },
  { id: 6, name: "Latency Optimization Matrix", icon: Zap, desc: "Reroute WebRTC traffic through proxy nodes." },
  { id: 7, name: "Self-Destruct Sequence", icon: ShieldAlert, desc: "Wipe all room history and terminate session." },
  { id: 8, name: "Biometric Voice Auth", icon: Lock, desc: "Require vocal passphrase to join rooms." },
  { id: 9, name: "Shadow Ban Enforcer", icon: UserX, desc: "Silently drop user packets without notification." },
  { id: 10, name: "Time-Dilation Sync", icon: Clock, desc: "Adjust message timestamp spoofing parameters." },
  { id: 11, name: "Raw Database Access", icon: Database, desc: "Direct SQL/NoSQL query execution bridge." },
  { id: 12, name: "God-Mode Debugger", icon: Code, desc: "Inject raw React state into active clients." },
  { id: 13, name: "Bandwidth Throttler", icon: Wifi, desc: "Artificially restrict peers to edge speeds." },
  { id: 14, name: "Message Intercept (Silent)", icon: Search, desc: "Log all decryptions before rendering." },
  { id: 15, name: "Force Client Update", icon: Download, desc: "Push OTA update to connected web clients." },
  { id: 16, name: "Holographic UI Toggle", icon: Sliders, desc: "Enable experimental 3D UI rendering." },
  { id: 17, name: "Server Burn-in Test", icon: Terminal, desc: "Flood the room with localized dummy data." },
  { id: 18, name: "System Wide Alert", icon: Info, desc: "Broadcast modal to all active users globally." },
  { id: 19, name: "Super-Resolution Video", icon: Settings, desc: "AI-upscale 480p streams to 4K locally." },
  { id: 20, name: "Vanguard Security Shield", icon: ShieldPlus, desc: "Block all unknown incoming connections." },
  // Adding 29 more:
  { id: 21, name: "Worldwide Access Toggle", icon: Globe, desc: "Enable Beta Features for ALL users globally.", isGlobalToggle: true },
  { id: 22, name: "Auto-Translate Stream", icon: Info, desc: "Real-time bidirectional message translation." },
  { id: 23, name: "Dark Web Routing", icon: ShieldAlert, desc: "Route messages through 3 hidden proxy nodes." },
  { id: 24, name: "Hologram Avatar Mode", icon: Video, desc: "Convert webcam feed into a 3D hologram asset." },
  { id: 25, name: "Voice Pitch Distortion", icon: Mic, desc: "Anonymize audio by lowering pitch in real-time." },
  { id: 26, name: "End-to-End Analytics", icon: Activity, desc: "Generate report on encryption efficiency." },
  { id: 27, name: "Chaos Mode Injection", icon: Code, desc: "Randomly reorder message chunks on client side." },
  { id: 28, name: "Silent Observer Mode", icon: Search, desc: "Join room without triggering participant alert." },
  { id: 29, name: "Crypto-Key Rotation", icon: Key, desc: "Force key rotation every 10 seconds." },
  { id: 30, name: "Ghost Messages", icon: Clock, desc: "Messages disappear automatically after 5 seconds." },
  { id: 31, name: "Sub-Saharan Server Node", icon: Globe, desc: "Force connection through alternate regional node." },
  { id: 32, name: "Anti-Screenshot Shield", icon: ShieldCheck, desc: "Attempt to block client-side screenshot capture." },
  { id: 33, name: "Neural Spam Filter", icon: Activity, desc: "Automatically hide messages resembling spam." },
  { id: 34, name: "Legacy Protocol Mode", icon: Settings, desc: "Downgrade encryption to v1.0 standard." },
  { id: 35, name: "Overclock WebRTC", icon: Zap, desc: "Bypass browser limits on RTC connections." },
  { id: 36, name: "Developer Console Access", icon: Terminal, desc: "Unlock raw JS execution environment for debugging." },
  { id: 37, name: "Zero-Gravity UI", icon: Sliders, desc: "Float UI elements using experimental physics engine." },
  { id: 38, name: "Network Packet Visualizer", icon: Activity, desc: "Overlay raw packets on screen." },
  { id: 39, name: "Database Compaction", icon: Database, desc: "Compress dormant document structures." },
  { id: 40, name: "VIP Bandwidth Priority", icon: Wifi, desc: "Prioritize your traffic over all other users." },
  { id: 41, name: "Fake Loading Sequences", icon: Clock, desc: "Add visual delay to make actions seem complex." },
  { id: 42, name: "Emergency Broadcast", icon: Info, desc: "Send red alert message to all users in room." },
  { id: 43, name: "Admin Persona Spoofing", icon: UserX, desc: "Hide your admin badge temporarily." },
  { id: 44, name: "Quantum Random Seed", icon: Key, desc: "Refresh the cryptography PRNG seed." },
  { id: 45, name: "Server Metrics Overlay", icon: Activity, desc: "Show CPU/RAM usage of current cloud instance." },
  { id: 46, name: "Force Dark Client", icon: Sliders, desc: "Force all Connected clients to use Dark Mode." },
  { id: 47, name: "Simulate Packet Loss", icon: Wifi, desc: "Drop 5% of packets to test resilience." },
  { id: 48, name: "Audio Transcript Subtitles", icon: Copy, desc: "Use Speech-to-text to subtitle incoming audio." },
  { id: 49, name: "Activate Sentinel Protocol", icon: ShieldPlus, desc: "Lock down all rooms, require admin approval to join." },
  { id: 50, name: "Biometric Keystroke Dynamics", icon: ShieldCheck, desc: "Verify identity via typing speed." },
  { id: 51, name: "AR Emoji Projection", icon: Video, desc: "Overlay AR emojis on remote video." },
  { id: 52, name: "Local Network Mesh", icon: Wifi, desc: "Fallback to local bluetooth mesh routing." },
  { id: 53, name: "Voice Cloning Simulator", icon: Mic, desc: "Mimic other users voices locally." },
  { id: 54, name: "Auto-Destruct Read Receipts", icon: Clock, desc: "Purge message locally upon recipient read." },
  { id: 55, name: "Satellite Relay Link", icon: Globe, desc: "Simulate high latency space transmission." },
  { id: 56, name: "Quantum Key Distribution", icon: Key, desc: "Simulate entanglement-based secure keys." },
  { id: 57, name: "Haptic Feedback Engine", icon: Zap, desc: "Vibrate device heavily on every incoming packet." },
  { id: 58, name: "Silent Disconnect", icon: UserX, desc: "Leave room without notifying server or peers." },
  { id: 59, name: "Retro Terminal UI", icon: Terminal, desc: "Render all chat as green text on black screen." },
  { id: 60, name: "Infinite Scroll Loop", icon: Copy, desc: "Duplicate messages infinitely in history." },
  { id: 61, name: "Aggressive Cache Purging", icon: Database, desc: "Wipe browser storage every 15 seconds." },
  { id: 62, name: "Memory Leak Simulation", icon: Activity, desc: "Artificially consume gigabytes of RAM." },
  { id: 63, name: "Fake IP Masking", icon: ShieldAlert, desc: "Broadcast false localized tracker data." },
  { id: 64, name: "Hyper-Compression", icon: Settings2, desc: "Compress video stream to 10 bytes/sec." },
  { id: 65, name: "Bypass DRM Protections", icon: Lock, desc: "Allow screen recording of protected content." },
  { id: 66, name: "Telepathic Input", icon: Activity, desc: "Attempt to parse cursor micromovements." },
  { id: 67, name: "Polyglot Encryptor", icon: Code, desc: "Encrypt using 5 different languages randomly." },
  { id: 68, name: "Zero-Knowledge Proof Mode", icon: ShieldCheck, desc: "Verify identity without revealing name." },
  { id: 69, name: "Nuclear Hardening", icon: ShieldPlus, desc: "Disable all background scripts and workers." },
  ...Array.from({ length: 200 }).map((_, i) => ({
    id: i + 70,
    name: `Experimental Module X-${i + 70}`,
    icon: ShieldAlert,
    desc: `Classified remote management feature delta-${i + 70}.`
  }))
];

export const PrivacyFooter = () => (
  <div className="mt-auto px-4 text-center text-[#9fb0d0]/50 text-[10px] max-w-5xl mx-auto border-t border-white/5 pt-8 mb-4 shrink-0 font-sans w-full">
    <h2 className="font-bold text-white text-xs mb-3 flex items-center justify-center gap-1.5 flex-wrap"><ShieldAlert className="w-4 h-4" /> Privacy Statement & Disclaimer</h2>
    <div className="space-y-3 leading-relaxed">
       <p><strong>Third-Party Services:</strong> H studio may use or rely on third-party services, including Google Firebase, Google services, and your web browser or device environment, to provide parts of the app. We do not control and are not responsible for the availability, security, privacy practices, errors, outages, updates, or actions of those third-party services or your browser.</p>
       <p className="font-semibold text-white/50">To the fullest extent permitted by law, H studio is not responsible for issues caused by third-party services, your browser, your device, or any external system outside our control.</p>
       <p className="pt-2 text-white/30 tracking-widest mt-2 border-t border-white/5 inline-block px-4">
         &copy; {new Date().getFullYear()} H studio, Inc. All rights reserved.
       </p>
    </div>
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<'login' | 'initial' | 'host' | 'join' | 'chat'>('login');
  const [joinCode, setJoinCode] = useState('');
  const [status, setStatus] = useState('Idle');
  const [messageText, setMessageText] = useState('');
  const [useEncryption, setUseEncryption] = useState(true);
  
  // Local History Settings (PWA Data Persistence)
  const [saveHistory, setSaveHistory] = useState(false);
  const [savedRooms, setSavedRooms] = useState<SavedRoom[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [directRooms, setDirectRooms] = useState<Room[]>([]);
  const [newContactEmail, setNewContactEmail] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [betaFeaturesWorldwide, setBetaFeaturesWorldwide] = useState(false);
  const [activeBetaFeatures, setActiveBetaFeatures] = useState<Record<number, boolean>>({});
  const [allowDirectMessages, setAllowDirectMessages] = useState(false);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState<'actions'|'beta'|'banlist'>('actions');
  const [bannedEmails, setBannedEmails] = useState<{id: string, email: string}[]>([]);
  const [banInput, setBanInput] = useState('');
  const [broadcastInput, setBroadcastInput] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState<{text: string, timestamp: number} | null>(null);
  const [dismissedBroadcast, setDismissedBroadcast] = useState(0);

  // Hmail Secure Account authentication states
  const [loginMethod, setLoginMethod] = useState<'google' | 'hmail'>('google');
  const [hmailEmail, setHmailEmail] = useState('');
  const [hmailPassword, setHmailPassword] = useState('');
  const [isHmailRegister, setIsHmailRegister] = useState(false);
  const [hmailRegisterName, setHmailRegisterName] = useState('');

  const [appAlert, setAppAlert] = useState<string | null>(null);

  useEffect(() => {
    window.alert = (msg) => {
      setAppAlert(String(msg));
    };
  }, []);

  const [activeAppTab, setActiveAppTab] = useState<'home' | 'chat' | 'mail' | 'meet'>('home');
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const activeAppTabRef = useRef(activeAppTab);
  useEffect(() => {
    activeAppTabRef.current = activeAppTab;
    if (activeAppTab === 'chat') {
      setUnreadMessagesCount(0);
    }
  }, [activeAppTab]);
  const [accessiveAccess, setAccessiveAccess] = useState(false);
  const [hMailUser, setHMailUser] = useState<{username: string} | null>(null);
  const [hMailMode, setHMailMode] = useState<'login' | 'register' | 'inbox'>('login');
  const [hMailInput, setHMailInput] = useState({ username: '', password: '' });
  const [hMailMessages, setHMailMessages] = useState<any[]>([]);

  useEffect(() => {
    // Only kept for backwards capability removal if needed, but not doing anything
  }, [mode]);

  const toggleSaveHistory = async () => {
    if (!user) return;
    const newValue = !saveHistory;
    setSaveHistory(newValue);
    if (!newValue) {
      // Clean up remotely
      savedRooms.forEach(sr => deleteDoc(doc(db, 'users', user.uid, 'saved_rooms', sr.id)));
    }
    await setDoc(doc(db, 'users', user.uid), { saveHistory: newValue }, { merge: true });
  };

  useEffect(() => {
    if (!user) return;
    const unsubRooms = onSnapshot(
      query(collection(db, 'rooms'), where('participantIds', 'array-contains', user.uid)),
      (snap) => {
         const allRooms = snap.docs.map(d => ({ ...d.data(), id: d.id } as Room));
         setDirectRooms(allRooms.filter(r => r.isDirect));
      }
    );
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBetaFeaturesWorldwide(!!data.betaFeaturesWorldwide);
        if (data.activeFeatures) setActiveBetaFeatures(data.activeFeatures);
        if (data.broadcast) setBroadcastMessage(data.broadcast);
      }
    });

    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if ('allowDirectMessages' in data) setAllowDirectMessages(!!data.allowDirectMessages);
        if ('saveHistory' in data) setSaveHistory(!!data.saveHistory);
      }
    });

    const unsubSavedRooms = onSnapshot(query(collection(db, 'users', user.uid, 'saved_rooms')), (snap) => {
      const allSaved = snap.docs.map(d => ({ ...d.data(), id: d.id } as SavedRoom));
      setSavedRooms(allSaved.sort((a,b) => b.timestamp - a.timestamp));
    });

    return () => { unsubRooms(); unsubSettings(); unsubProfile(); unsubSavedRooms(); };
  }, [user]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTyping = () => {
    if (!room || !user || mode !== 'chat') return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    const now = Date.now();
    // Only update if typing state is stale locally
    if (!room.typing || !room.typing[user.uid] || now - room.typing[user.uid] > 2000) {
      updateDoc(doc(db, 'rooms', room.id), {
        [`typing.${user.uid}`]: now
      }).catch((e) => handleFirestoreError(e, OperationType.UPDATE, `rooms/${room.id}`));
    }

    typingTimeoutRef.current = setTimeout(() => {
       if (room?.id) {
         updateDoc(doc(db, 'rooms', room.id), {
           [`typing.${user.uid}`]: deleteField()
         }).catch((e) => handleFirestoreError(e, OperationType.UPDATE, `rooms/${room.id}`));
       }
    }, 2500);
  };

  // --- Calling & Signals State ---
  const [inCall, setInCall] = useState(false);
  const [callType, setCallType] = useState<'audio'|'video'|null>(null);
  const pcMap = useRef<Record<string, RTCPeerConnection>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const processedSignals = useRef<Set<string>>(new Set());
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  const roomRef = useRef<Room | null>(null);
  const useEncryptionRef = useRef(true);
  const userRef = useRef<User | null>(null);

  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { useEncryptionRef.current = useEncryption; }, [useEncryption]);
  useEffect(() => { userRef.current = user; }, [user]);

  const saveRoomToLocal = (roomData: Room) => {
    if (saveHistory && userRef.current) {
      setDoc(doc(db, 'users', userRef.current.uid, 'saved_rooms', roomData.id), {
        id: roomData.id,
        code: roomData.code,
        hostName: roomData.hostName,
        timestamp: Date.now()
      }, { merge: true });
    }
  };

  const decodeMessage = (raw: string | undefined | null, roomCode: string) => {
    let text = raw || '';
    let isEncrypted = false;
    if (text.startsWith('E2E:')) {
      text = decryptLocalData(text.substring(4), roomCode);
      isEncrypted = true;
    }
    if (text.startsWith('AUDIO:')) return { type: 'audio', content: text.substring(6), isEncrypted };
    if (text.startsWith('VIDEO:')) return { type: 'video', content: text.substring(6), isEncrypted };
    if (text.startsWith('SIGNAL:')) return { type: 'signal', content: text.substring(7), isEncrypted };
    return { type: 'text', content: text, isEncrypted };
  };

  const sendPayload = async (rawPayload: string) => {
    const curRoom = roomRef.current;
    if (!curRoom || !userRef.current) return;
    let finalPayload = rawPayload;
    if (useEncryptionRef.current) finalPayload = `E2E:${encryptLocalData(rawPayload, curRoom.code)}`;
    try {
      await addDoc(collection(db, 'rooms', curRoom.id, 'messages'), {
        senderId: userRef.current.uid,
        senderName: userName,
        text: finalPayload,
        timestamp: serverTimestamp()
      });
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, `rooms/${curRoom.id}/messages`); }
  };

  // --- Call Methods ---
  const toggleCall = async (withVideo = false) => {
    if (inCall) {
      sendPayload(`SIGNAL:{"type":"leave_call"}`);
      setInCall(false);
      setCallType(null);
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
      Object.values(pcMap.current).forEach((pc: RTCPeerConnection) => pc.close());
      pcMap.current = {};
      setRemoteStreams({});
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
        localStreamRef.current = stream;
        setInCall(true);
        setCallType(withVideo ? 'video' : 'audio');
        sendPayload(`SIGNAL:{"type":"join_call"}`);
      } catch (err) { alert("Camera/Microphone access denied or error occurred."); }
    }
  };

  const createPeer = (targetUid: string) => {
    if (pcMap.current[targetUid]) return pcMap.current[targetUid];
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pcMap.current[targetUid] = pc;
    
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
    
    pc.onicecandidate = (e) => {
      if (e.candidate) sendPayload(`SIGNAL:{"type":"ice","to":"${targetUid}","candidate":${JSON.stringify(e.candidate.toJSON())}}`);
    };
    pc.ontrack = (e) => {
      if (e.streams[0]) setRemoteStreams(prev => ({ ...prev, [targetUid]: e.streams[0] }));
    };
    return pc;
  };

  // --- Voice Messaging ---
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [participantVolumes, setParticipantVolumes] = useState<Record<string, number>>({});
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const toggleScreenShare = async () => {
    if (!inCall || callType !== 'video') {
       alert("Screen sharing is only supported during active video calls.");
       return;
    }
    
    if (isScreenSharing) {
       try {
         const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
         const newVideoTrack = newStream.getVideoTracks()[0];
         const senders = Object.values(pcMap.current).map((pc: RTCPeerConnection) => pc.getSenders().find(s => s.track && s.track.kind === 'video')).filter(Boolean);
         
         senders.forEach(sender => sender!.replaceTrack(newVideoTrack).catch(console.error));
         
         const oldVideoTrack = localStreamRef.current?.getVideoTracks()[0];
         if (oldVideoTrack) {
            oldVideoTrack.stop();
            localStreamRef.current?.removeTrack(oldVideoTrack);
         }
         localStreamRef.current?.addTrack(newVideoTrack);
         setIsScreenSharing(false);
       } catch(e) { console.error(e); }
    } else {
       try {
         const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
         const screenTrack = displayStream.getVideoTracks()[0];
         
         screenTrack.onended = () => {
             // Handle native stop sharing button
             navigator.mediaDevices.getUserMedia({ video: true }).then(newStream => {
                 const newVideoTrack = newStream.getVideoTracks()[0];
                 const senders = Object.values(pcMap.current).map((pc: RTCPeerConnection) => pc.getSenders().find(s => s.track && s.track.kind === 'video')).filter(Boolean);
                 senders.forEach(sender => sender!.replaceTrack(newVideoTrack).catch(console.error));
                 
                 const oldVideoTrack = localStreamRef.current?.getVideoTracks()[0];
                 if (oldVideoTrack) {
                    oldVideoTrack.stop();
                    localStreamRef.current?.removeTrack(oldVideoTrack);
                 }
                 localStreamRef.current?.addTrack(newVideoTrack);
                 setIsScreenSharing(false);
             }).catch(console.error);
         };
         
         const senders = Object.values(pcMap.current).map((pc: RTCPeerConnection) => pc.getSenders().find(s => s.track && s.track.kind === 'video')).filter(Boolean);
         senders.forEach(sender => sender!.replaceTrack(screenTrack).catch(console.error));
         
         const oldVideoTrack = localStreamRef.current?.getVideoTracks()[0];
         if (oldVideoTrack) {
            oldVideoTrack.stop();
            localStreamRef.current?.removeTrack(oldVideoTrack);
         }
         localStreamRef.current?.addTrack(screenTrack);
         setIsScreenSharing(true);
       } catch (e) { console.error(e); }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => { await sendPayload(`AUDIO:${reader.result as string}`); };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch { alert("Microphone access is required."); }
  };
  const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); } };

  // Auth
  useEffect(() => {
    let callUnsub: (() => void) | null = null;
    let banUnsub: (() => void) | null = null;
    const unsub = onAuthStateChanged(auth, async (u) => {
      
      // Setup Ban listener
      banUnsub = onSnapshot(collection(db, 'banned_emails'), (snapshot) => {
         const bans = snapshot.docs.map(d => ({id: d.id, email: d.data().email}));
         setBannedEmails(bans);
         
         if (u && u.email && bans.some(b => b.email?.toLowerCase() === u.email!.toLowerCase())) {
            auth.signOut();
            window.alert('This account has been banned.');
         }
      });
      
      if (u) {
        // Double check ban list immediately for paranoia
        const idToken = await u.getIdTokenResult();
        const bannedDocs = await getDocs(query(collection(db, 'banned_emails'), where('email', '==', u.email?.toLowerCase())));
        if (!bannedDocs.empty) {
           auth.signOut();
           window.alert('This account has been banned.');
           return;
        }

        setUser(u); setUserName(u.displayName || 'Guest User'); setMode('initial'); setStatus('Ready');
        try {
          const uDoc = await getDoc(doc(db, 'users', u.uid));
          const hasDMsFlag = uDoc.exists() && ('allowDirectMessages' in uDoc.data());
          await setDoc(doc(db, 'users', u.uid), {
            uid: u.uid,
            email: u.email,
            name: u.displayName || 'Guest User',
            ...(hasDMsFlag ? {} : { allowDirectMessages: true })
          }, { merge: true });

          // Global Incoming Call Listener
          const q = query(
            collection(db, 'hmeet_sessions'),
            where('receiverUid', '==', u.uid),
            where('status', '==', 'ringing')
          );
          callUnsub = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
              const docData = snapshot.docs[0].data();
              if (docData.callerUid !== u.uid && activeAppTabRef.current !== 'meet') {
                window.alert(`Incoming ${docData.type || 'audio'} call from ${docData.callerName || 'Unknown'}! Open HMeet to answer.`);
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification(`Incoming ${docData.type || 'audio'} call from ${docData.callerName || 'Unknown'}`, {
                    body: "Click to open HMeet tab",
                  });
                }
              }
            }
          });
        } catch(e) {}
        try {
          const authCheck = await getDoc(doc(db, 'admin_check', 'ping'));
          setIsGlobalAdmin(true);
        } catch(e) {
          try {
            if (aUser.email) {
              const hmailDoc = await getDoc(doc(db, 'hmail_users', aUser.email.toLowerCase()));
              if (hmailDoc.exists() && hmailDoc.data().isITAdmin) {
                setIsGlobalAdmin(true);
                return;
              }
            }
          } catch(err) {}
          setIsGlobalAdmin(false);
        }
      } else { 
        setUser(null); 
        setMode('login'); 
        setStatus('Signed Out'); 
        setIsGlobalAdmin(false); 
        if (callUnsub) { callUnsub(); callUnsub = null; }
      }
    });
    return () => {
      unsub();
      if (callUnsub) callUnsub();
      if (banUnsub) banUnsub();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'users', user.uid, 'contacts'), (snap) => {
      setContacts(snap.docs.map(d => d.data() as Contact));
    });
    return () => unsub();
  }, [user]);

  const toggleAllowDirectMessages = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), { allowDirectMessages: !allowDirectMessages }, { merge: true });
    } catch(e) {
      console.error(e);
      alert('Failed to update privacy settings.');
    }
  };

  const handleLogin = async () => { 
    setStatus('Signing In...'); 
    try { 
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider); 
    } catch { 
      setStatus('Login Failed'); 
    } 
  };

  const handleHmailLoginOrRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hmailEmail.trim() || !hmailPassword.trim()) {
      alert('Please fill in both email and password.');
      return;
    }

    let email = hmailEmail.trim().toLowerCase();
    if (!email.includes('@')) {
      email = email + '@hmail.com';
    }

    setStatus(isHmailRegister ? 'Registering...' : 'Signing In...');

    try {
      const passwordHash = CryptoJS.SHA256(hmailPassword.trim()).toString();

      if (isHmailRegister) {
        if (!hmailRegisterName.trim()) {
          alert('Please enter your display name.');
          setStatus('Ready');
          return;
        }

        const uDoc = await getDoc(doc(db, 'hmail_users', email));
        if (uDoc.exists()) {
          alert('This Hmail account already exists in database.');
          setStatus('Login Failed');
          return;
        }

        const credentials = await createUserWithEmailAndPassword(auth, email, hmailPassword);
        
        await updateProfile(credentials.user, {
          displayName: hmailRegisterName.trim()
        });

        await setDoc(doc(db, 'hmail_users', email), {
          username: email,
          domain: '@hmail.com',
          passwordHash: passwordHash,
          isITAdmin: false,
          fullName: hmailRegisterName.trim(),
          createdAt: serverTimestamp()
        });

        alert('Hmail account registered and logged in successfully!');
      } else {
        let canLogin = false;
        const uDoc = await getDoc(doc(db, 'hmail_users', email));
        if (uDoc.exists()) {
          const data = uDoc.data();
          if (data.passwordHash === passwordHash) {
            canLogin = true;
          } else {
            alert('Incorrect Hmail account password.');
            setStatus('Login Failed');
            return;
          }
        } else {
          canLogin = true;
        }

        if (canLogin) {
          try {
            await signInWithEmailAndPassword(auth, email, hmailPassword);
          } catch (authErr: any) {
            if (authErr && (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/invalid-login-credentials') && uDoc.exists()) {
              const displayName = email.split('@')[0];
              const credentials = await createUserWithEmailAndPassword(auth, email, hmailPassword);
              await updateProfile(credentials.user, {
                displayName: displayName
              });
            } else {
              throw authErr;
            }
          }
        }
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Authentication failed.');
      setStatus('Login Failed');
    }
  };

  const handleLogout = () => { if (inCall) toggleCall(); if (isRecording) stopRecording(); auth.signOut(); leaveRoom(); };



  const sendBroadcast = async () => {
    if (!broadcastInput.trim() || !isGlobalAdmin) return;
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        broadcast: { text: broadcastInput.trim(), timestamp: Date.now() }
      }, { merge: true });
      setBroadcastInput('');
      alert('Broadcast dispatched.');
    } catch (e) { console.error(e); alert('Failed to send broadcast'); }
  };

  const toggleBetaFeature = async (featureId: number) => {
    const feature = ADMIN_FEATURES.find(f => f.id === featureId);
    if (!feature || !isGlobalAdmin) return;

    if (feature.isGlobalToggle) {
      try {
        await setDoc(doc(db, 'settings', 'global'), { betaFeaturesWorldwide: !betaFeaturesWorldwide }, { merge: true });
        // The listener will update our state!
        alert(`Worldwide Access is now ${!betaFeaturesWorldwide ? 'ENABLED' : 'DISABLED'}.`);
      } catch (e) {
        console.error(e);
        alert('Failed to update global setting');
      }
      return;
    }

    const nowActive = !activeBetaFeatures[featureId];
    try {
      await setDoc(doc(db, 'settings', 'global'), {
         activeFeatures: {
            ...activeBetaFeatures,
            [featureId]: nowActive
         }
      }, { merge: true });
      
      if (nowActive) {
        alert(`[BETA FEATURE ACTIVATED GLOBALLY]\n\n${feature.name} is now active for everyone.\n${feature.desc}`);
      } else {
        alert(`[BETA FEATURE DEACTIVATED]\n\n${feature.name} has been stopped.`);
      }
    } catch(e) { console.error(e); }
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Room Listener
  useEffect(() => {
    if (!room?.id) return;
    let isFirstMessageLoad = true;
    const unsubRoom = onSnapshot(doc(db, 'rooms', room.id), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Room;
        if (data.banned && data.banned[userRef.current?.uid || '']) { alert('You have been banned from this room.'); leaveRoom(); return; }
        if (data.status === 'active' && !data.participants[userRef.current?.uid || ''] && data.hostId !== userRef.current?.uid) { alert('You have been removed from this room.'); leaveRoom(); return; }
        setRoom({ ...data, id: snapshot.id });
        if (data.status === 'active') { setMode('chat'); setStatus('Connected'); saveRoomToLocal(data); }
      } else { alert("Room closed."); leaveRoom(); }
    });

    const unsubMessages = onSnapshot(query(collection(db, 'rooms', room.id, 'messages'), orderBy('timestamp', 'asc'), limit(150)), (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      setMessages(msgs);

      // Request notification permission if not asked
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      snapshot.docChanges().forEach(change => {
         if (change.type === 'added') {
            const msg = { id: change.doc.id, ...change.doc.data() } as Message;
            if (!processedSignals.current.has(msg.id)) {
              processedSignals.current.add(msg.id);
              const decoded = decodeMessage(msg.text, roomRef.current?.code || '');
              
              if (decoded.type === 'signal' && msg.senderId !== userRef.current?.uid) {
                try {
                  const signal = JSON.parse(decoded.content);
                  if (signal.to && signal.to !== userRef.current?.uid) return;
                  if (signal.type === 'join_call' && localStreamRef.current) {
                    const pc = createPeer(msg.senderId);
                    pc.createOffer().then(offer => { pc.setLocalDescription(offer); sendPayload(`SIGNAL:{"type":"offer","to":"${msg.senderId}","offer":${JSON.stringify(offer)}}`); });
                  } else if (signal.type === 'offer' && localStreamRef.current) {
                    const pc = createPeer(msg.senderId);
                    pc.setRemoteDescription(new RTCSessionDescription(signal.offer)).then(() => pc.createAnswer()).then(answer => { pc.setLocalDescription(answer); sendPayload(`SIGNAL:{"type":"answer","to":"${msg.senderId}","answer":${JSON.stringify(answer)}}`); });
                  } else if (signal.type === 'answer') { pcMap.current[msg.senderId]?.setRemoteDescription(new RTCSessionDescription(signal.answer)); } 
                  else if (signal.type === 'ice') { pcMap.current[msg.senderId]?.addIceCandidate(new RTCIceCandidate(signal.candidate)); } 
                  else if (signal.type === 'leave_call') { pcMap.current[msg.senderId]?.close(); delete pcMap.current[msg.senderId]; setRemoteStreams(prev => { const next = {...prev}; delete next[msg.senderId]; return next; }); }
                } catch (e) { console.error("Signal parsing error", e); }
              } else if (msg.senderId !== userRef.current?.uid && decoded.type !== 'signal') {
                // It's a real message from someone else
                // Check if we are in the background or not on the Chat tab
                const isBackground = document.visibilityState === 'hidden';
                const isNotOnChatTab = activeAppTabRef.current !== 'chat';

                if (isNotOnChatTab) {
                  setUnreadMessagesCount(prev => prev + 1);
                }

                if (!isFirstMessageLoad && (isBackground || isNotOnChatTab) && 'Notification' in window && Notification.permission === 'granted') {
                   let notificationText = 'New message';
                   if (decoded.type === 'text') notificationText = decoded.content;
                   else if (decoded.type === 'video') notificationText = 'Sent a video';
                   else if (decoded.type === 'audio') notificationText = 'Sent an audio message';
                   
                   new Notification(`New message from ${msg.senderName}`, {
                      body: notificationText,
                      icon: '/favicon.svg'
                   });
                }
              }
            }
         }
      });
      isFirstMessageLoad = false;
    });
    return () => { unsubRoom(); unsubMessages(); };
  }, [room?.id]);

  const createRoom = async () => {
    if (!userName || !user) return;
    setStatus('Creating...');
    const code = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const roomId = `room_${Date.now()}`;
    const roomData: Omit<Room, 'id'> = { code, hostName: userName, hostId: user.uid, participants: { [user.uid]: userName }, participantIds: [user.uid], status: 'waiting' };
    try { await setDoc(doc(db, 'rooms', roomId), roomData); setRoom({ ...roomData, id: roomId }); setMode('host'); setStatus('Waiting for friends'); saveRoomToLocal({ ...roomData, id: roomId }); } 
    catch(e) { console.error(e); setStatus('Error creating room'); }
  };

  const startDirectMessage = async (contact: Contact) => {
    if (!userName || !user) return;
    setStatus('Creating DM...');
    
    const sorted = [user.uid, contact.uid].sort();
    const roomId = `dm_${sorted[0]}_${sorted[1]}`;
    
    // Attempt to load existing first if active
    try {
      const qs = await getDocs(query(collection(db, 'rooms'), where('__name__', '==', roomId)));
      if (!qs.empty) {
        let rData = qs.docs[0].data() as Room;
        if(rData.status === 'closed') {
           rData.status = 'active';
           await updateDoc(doc(db, 'rooms', roomId), { status: 'active' });
        }
        setRoom({ ...rData, id: qs.docs[0].id });
        setMode('chat'); setStatus('Connected');
        return;
      }
    } catch(e) {}

    const roomData: Omit<Room, 'id'> = { 
      code: 'direct', 
      hostName: userName, 
      hostId: user.uid, 
      participants: { [user.uid]: userName, [contact.uid]: contact.name }, 
      participantIds: [user.uid, contact.uid],
      status: 'active',
      isDirect: true
    };
    try { await setDoc(doc(db, 'rooms', roomId), roomData); setRoom({ ...roomData, id: roomId }); setMode('chat'); setStatus('Connected'); saveRoomToLocal({ ...roomData, id: roomId }); } 
    catch(e) { console.error(e); setStatus('Error starting DM'); }
  };

  const addContact = async () => {
    if (!newContactEmail.trim() || !user) return;
    try {
      const q = query(collection(db, 'users'), where('email', '==', newContactEmail.trim()), limit(1));
      const qs = await getDocs(q);
      if (qs.empty) { alert('User not found by that email.'); return; }
      const contactData = qs.docs[0].data();
      if (contactData.uid === user.uid) { alert("You can't add yourself!"); return; }
      if (!contactData.allowDirectMessages) { alert("This user has opted out of being added as a contact."); return; }
      await setDoc(doc(db, 'users', user.uid, 'contacts', contactData.uid), {
        uid: contactData.uid, email: contactData.email, name: contactData.name
      });
      setNewContactEmail('');
    } catch (e) {
      console.error(e);
      alert('Failed to add contact.');
    }
  };

  const removeContact = async (contactUid: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'contacts', contactUid));
    } catch (e) {
      console.error(e);
      alert('Failed to remove contact.');
    }
  };

  const joinRoom = async (overrideCode?: string) => {
    const targetCode = typeof overrideCode === 'string' ? overrideCode : joinCode;
    if (!userName || !targetCode || !user) return;
    setStatus('Joining...');
    try {
      const q = query(collection(db, 'rooms'), where('code', '==', targetCode), limit(1));
      const qs = await getDocs(q);
      if (qs.empty) { alert('Room not found'); setStatus('Ready'); return; }
      const rDoc = qs.docs[0];
      const rData = rDoc.data() as Room;

      if (rData.banned && rData.banned[user.uid]) { alert('You are banned from this room by the host.'); setStatus('Ready'); return; }

      const updatedParticipants = { ...rData.participants, [user.uid]: userName };
      const updatedIds = rData.participantIds ? Array.from(new Set([...rData.participantIds, user.uid])) : [user.uid, rData.hostId];
      await updateDoc(doc(db, 'rooms', rDoc.id), { [`participants.${user.uid}`]: userName, participantIds: updatedIds, status: 'active' });
      setRoom({ ...rData, id: rDoc.id, participants: updatedParticipants, participantIds: updatedIds, status: 'active' });
      setMode('chat'); setStatus('Connected');
    } catch (e) { console.error(e); setStatus('Error joining'); }
  };

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageText.trim()) return;
    const text = messageText; setMessageText(''); 

    // Admin System Broadcast check
    if (isGlobalAdmin && text.startsWith('/broadcast ')) {
        const bText = text.substring(11).trim();
        if (bText) {
          try {
            await setDoc(doc(db, 'settings', 'global'), {
              broadcast: { text: bText, timestamp: Date.now() }
            }, { merge: true });
          } catch(err) { console.error(err); }
        }
        return;
    }

    await sendPayload(text);
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!room || !user) return;
    try {
      const msg = messages.find(m => m.id === messageId);
      if (!msg) return;
      const currentReactions: Record<string, string[]> = msg.reactions || {};
      const uids = currentReactions[emoji] || [];
      let newUids: string[];
      if (uids.includes(user.uid)) {
        newUids = uids.filter(id => id !== user.uid);
      } else {
        newUids = [...uids, user.uid];
      }
      const updatedReactions = { ...currentReactions };
      if (newUids.length === 0) {
        delete updatedReactions[emoji];
      } else {
        updatedReactions[emoji] = newUids;
      }
      await updateDoc(doc(db, 'rooms', room.id, 'messages', messageId), {
        reactions: updatedReactions
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `rooms/${room.id}/messages/${messageId}`);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 8 * 1024 * 1024) return alert("Video too large! Max 8MB limitation.");
    const reader = new FileReader();
    reader.onloadend = async () => { await sendPayload(`VIDEO:${reader.result as string}`); };
    reader.readAsDataURL(file);
  };

  const leaveRoom = () => { if (inCall) toggleCall(); if (isRecording) stopRecording(); setRoom(null); setMessages([]); setMode('initial'); setJoinCode(''); setStatus('Ready'); setIsScreenSharing(false); };
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user && userName && mode === 'initial') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlRoomCode = searchParams.get('room');
      if (urlRoomCode) {
        joinRoom(urlRoomCode);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [user, userName, mode]);
  const copyCode = () => { if (room?.code) navigator.clipboard.writeText(room.code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };

  const banUser = async (targetUid: string) => {
    if (!room) return;
    try { await updateDoc(doc(db, 'rooms', room.id), { [`participants.${targetUid}`]: deleteField(), [`banned.${targetUid}`]: true }); } 
    catch (e) { console.error('Failed to ban', e); }
  };

  const downloadChat = () => {
    let content = "H studio Log - Security Protocol v50.9.1\n=================================\n\n";
    messages.filter(m => !decodeMessage(m.text, room?.code || '').type.includes('signal')).forEach(msg => {
      const decoded = decodeMessage(msg.text, room?.code || '');
      const time = msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleString() : 'Unknown Time';
      content += `[${time}] ${msg.senderName}: `;
      if (decoded.type === 'text') content += decoded.content; else content += `[${decoded.type.toUpperCase()} MESSAGE]`;
      content += "\n";
    });
    const blob = new Blob([content], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `H-chat-log-${room?.id || 'session'}.txt`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className={`min-h-screen text-[#e8eefc] selection:bg-blue-500/40 flex transition-all duration-500 ${accessiveAccess ? 'text-lg font-medium tracking-wide contrast-125' : ''}`} style={{ background: 'radial-gradient(circle at top left, rgba(96,165,250,.2), transparent 30%), radial-gradient(circle at top right, rgba(52,211,153,.15), transparent 25%), linear-gradient(135deg, #040612, #0d152a 50%, #162544)' }}>

      {/* Sidebar Navigation */}
      <div className="flex-shrink-0 w-20 border-r border-white/10 bg-[#0d152a]/40 backdrop-blur-3xl flex flex-col items-center py-8 gap-6 z-40 overflow-hidden min-h-screen relative shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
           <div className="absolute top-0 left-0 w-full h-[25%] bg-gradient-to-b from-blue-500/10 via-transparent to-transparent pointer-events-none" />
           <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-600/15 border border-white/15 flex items-center justify-center text-blue-400 font-extrabold shadow-lg transition-transform hover:scale-105 select-none font-sans text-xl tracking-tighter">H</div>
         
         <div className="flex flex-col gap-5 mt-10 flex-1 w-full px-3 relative z-10">
             <button onClick={() => setActiveAppTab('home')} className={`p-3.5 rounded-2xl flex justify-center items-center transition-all duration-300 relative group ${activeAppTab === 'home' ? 'bg-white/10 text-white border border-white/25 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.3),_0_8px_16px_rgba(0,0,0,0.4)]' : 'text-[#9fb0d0]/50 border border-transparent hover:bg-white/5 hover:text-white hover:scale-105'}`} title="H studio home">
                <LayoutGrid className="w-5 h-5" />
                <div className="absolute left-full ml-3 px-2 py-1.5 bg-black/90 text-white text-[10px] font-bold tracking-wider uppercase rounded-lg border border-white/10 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap">H studio home</div>
             </button>
             <button onClick={() => setActiveAppTab('chat')} className={`p-3.5 rounded-2xl flex justify-center items-center transition-all duration-300 relative group ${activeAppTab === 'chat' ? 'bg-white/10 text-white border border-white/25 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.3),_0_8px_16px_rgba(0,0,0,0.4)]' : 'text-[#9fb0d0]/50 border border-transparent hover:bg-white/5 hover:text-white hover:scale-105'}`} title="H chat">
                <div className="relative">
                   <MessageSquare className="w-5 h-5" />
                   {unreadMessagesCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-extrabold text-white animate-pulse shadow-md">
                         {unreadMessagesCount}
                      </span>
                   )}
                </div>
                <div className="absolute left-full ml-3 px-2 py-1.5 bg-black/90 text-white text-[10px] font-bold tracking-wider uppercase rounded-lg border border-white/10 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap">H chat</div>
             </button>
             <button onClick={() => setActiveAppTab('mail')} className={`p-3.5 rounded-2xl flex justify-center items-center transition-all duration-300 relative group ${activeAppTab === 'mail' ? 'bg-white/10 text-white border border-white/25 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.3),_0_8px_16px_rgba(0,0,0,0.4)]' : 'text-[#9fb0d0]/50 border border-transparent hover:bg-white/5 hover:text-white hover:scale-105'}`} title="H mail">
                <Mail className="w-5 h-5" />
                <div className="absolute left-full ml-3 px-2 py-1.5 bg-black/90 text-white text-[10px] font-bold tracking-wider uppercase rounded-lg border border-white/10 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap">H mail</div>
             </button>
             <button onClick={() => setActiveAppTab('meet')} className={`p-3.5 rounded-2xl flex justify-center items-center transition-all duration-300 relative group ${activeAppTab === 'meet' ? 'bg-white/10 text-white border border-white/25 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.3),_0_8px_16px_rgba(0,0,0,0.4)]' : 'text-[#9fb0d0]/50 border border-transparent hover:bg-white/5 hover:text-white hover:scale-105'}`} title="Hmeet calls">
                <Video className="w-5 h-5" />
                <div className="absolute left-full ml-3 px-2 py-1.5 bg-black/90 text-white text-[10px] font-bold tracking-wider uppercase rounded-lg border border-white/10 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap">Hmeet calls</div>
             </button>
         </div>
         
         <div className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-opacity">
            <span className="text-[9px] font-bold tracking-widest text-[#9fb0d0]/80">v50.9.1</span>
         </div>
      </div>

      <div className={`flex-1 flex items-center justify-center relative overflow-y-auto w-full transition-all duration-300 ${accessiveAccess ? 'p-8 md:p-12' : 'p-4'}`}>
        {activeAppTab === 'home' && (
           <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl flex flex-col gap-10 p-6 items-center">
              <div className="text-center mb-4 relative z-10">
                 <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-[16px] border border-blue-500/20 bg-blue-500/10 mb-4 select-none">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-blue-300 font-mono">WORKSPACE STATION V50.9.1</span>
                 </div>
                 <h1 className="text-5xl font-extrabold text-white tracking-widest mb-3 uppercase flex items-center justify-center gap-2 relative">
                    H studio
                 </h1>
                 <p className="text-[#9fb0d0]/75 max-w-md text-sm mx-auto font-sans leading-relaxed">
                    Welcome to the Apple-inspired workspace environment. Access encrypted communication nodes and digital storage lockers securely.
                 </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full relative z-10">
                 
                 {/* H Chat Card */}
                 <button 
                    onClick={() => setActiveAppTab('chat')} 
                    className={`flex flex-col items-center text-center p-8 bg-gradient-to-br from-white/10 to-white/5 rounded-[32px] border border-white/20 transition-all duration-300 group hover:scale-[1.03] shadow-2xl relative overflow-hidden liquid-glass ${accessiveAccess ? 'ring-4 ring-blue-400/80 p-10 border-white/60' : 'hover:border-blue-400/50'}`}
                 >
                    {/* Gloss sheen effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-5 text-blue-400 group-hover:scale-110 transition-transform shadow-lg relative z-10">
                       <MessageSquare className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight mb-2 relative z-10">H chat</h2>
                    <p className="text-xs text-[#9fb0d0]/75 leading-relaxed relative z-10 px-2">
                       Secure real-time encrypted instant messaging, peer-to-peer screen shares and high-definition video group rooms.
                    </p>
                    <div className="mt-5 text-[10px] font-bold tracking-widest text-blue-400 uppercase opacity-0 group-hover:opacity-100 transition-opacity">Launch Module &rarr;</div>
                 </button>

                 {/* H Mail Card */}
                 <button 
                    onClick={() => setActiveAppTab('mail')} 
                    className={`flex flex-col items-center text-center p-8 bg-gradient-to-br from-white/10 to-white/5 rounded-[32px] border border-white/20 transition-all duration-300 group hover:scale-[1.03] shadow-2xl relative overflow-hidden liquid-glass ${accessiveAccess ? 'ring-4 ring-blue-400/80 p-10 border-white/60' : 'hover:border-blue-400/50'}`}
                 >
                    {/* Gloss sheen effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-5 text-indigo-400 group-hover:scale-110 transition-transform shadow-lg relative z-10">
                       <Mail className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight mb-2 relative z-10">H mail</h2>
                    <p className="text-xs text-[#9fb0d0]/75 leading-relaxed relative z-10 px-2">
                       Modern secure email inbox with administrative company controls, sandboxed directories and remote user lookup.
                    </p>
                    <div className="mt-5 text-[10px] font-bold tracking-widest text-indigo-400 uppercase opacity-0 group-hover:opacity-100 transition-opacity">Launch Module &rarr;</div>
                 </button>

                 {/* Hmeet Audio/Video Card */}
                 <button 
                    onClick={() => setActiveAppTab('meet')} 
                    className={`flex flex-col items-center text-center p-8 bg-gradient-to-br from-white/10 to-white/5 rounded-[32px] border border-white/20 transition-all duration-300 group hover:scale-[1.03] shadow-2xl relative overflow-hidden liquid-glass ${accessiveAccess ? 'ring-4 ring-blue-400/80 p-10 border-white/60' : 'hover:border-blue-400/50'}`}
                 >
                    {/* Gloss sheen effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-5 text-blue-400 group-hover:scale-110 transition-transform shadow-lg relative z-10">
                       <Video className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight mb-2 relative z-10">Hmeet</h2>
                    <p className="text-xs text-[#9fb0d0]/75 leading-relaxed relative z-10 px-2">
                       High-quality audio and video calling with 8-digit unique phone reservations, live dialer keypad and pure WebRTC.
                    </p>
                    <div className="mt-5 text-[10px] font-bold tracking-widest text-[#9fb0d0]/80 opacity-0 group-hover:opacity-100 transition-opacity">Launch Module &rarr;</div>
                 </button>

                 {/* Accessive Access Card */}
                 <button 
                    onClick={() => setAccessiveAccess(!accessiveAccess)} 
                    className={`flex flex-col items-center text-center p-8 rounded-[32px] transition-all duration-300 group hover:scale-[1.03] shadow-2xl relative overflow-hidden liquid-glass ${accessiveAccess ? 'bg-emerald-500/10 border-emerald-500/60 ring-4 ring-emerald-400' : 'hover:border-emerald-500/50'}`}
                 >
                    {/* Gloss sheen effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg relative z-10 ${accessiveAccess ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300' : 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400'}`}>
                       <Eye className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight mb-2 relative z-10">Accessive Access</h2>
                    <p className="text-xs text-[#9fb0d0]/75 leading-relaxed relative z-10 px-2">
                       {accessiveAccess ? 'High contrast theme and font magnification is fully active for improved clarity.' : 'Enable larger font sizing, improved visual target contrasts, and distinct layout boundaries.'}
                    </p>
                    <div className="mt-5 text-[10px] font-bold tracking-widest text-emerald-400 uppercase">
                       {accessiveAccess ? 'Active (Click to Turn Off)' : 'Enable Accessibility Mode'}
                    </div>
                 </button>

              </div>
           </motion.div>
        )}

        {activeAppTab === 'chat' && (
          <div className="w-full flex-1 flex flex-col items-center justify-center min-h-max">
        {/* Video Call Grid */}
        {inCall && (
           <div className="fixed top-4 right-4 z-50 flex flex-col gap-4 pointer-events-none">
             <div className="flex gap-2">
                 <div className="w-32 h-24 bg-black/80 rounded-[16px] overflow-hidden border border-white/20 shadow-xl relative pointer-events-auto group">
                    <video autoPlay playsInline muted ref={el => { if(el) el.srcObject = localStreamRef.current; }} className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 p-1 bg-gradient-to-t from-black/80 to-transparent text-[10px] truncate">You {callType === 'audio' && '(Audio Only)'}</div>
                 </div>
                 {Object.entries(remoteStreams).map(([uid, stream], index) => (
                    <div key={`${uid}-${index}`} className="w-32 h-24 bg-black/80 rounded-[16px] overflow-hidden border border-white/20 shadow-xl relative pointer-events-auto group">
                        <video autoPlay playsInline ref={el => { if(el) { el.srcObject = stream; el.volume = participantVolumes[uid] ?? 1; } }} className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 p-1 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end">
                            <span className="text-[10px] truncate drop-shadow-md font-medium text-white px-1 relative z-10">{room?.participants[uid] || 'Participant'}</span>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-1 mt-0.5 relative z-10">
                               {(participantVolumes[uid] ?? 1) === 0 ? <VolumeX className="w-3 h-3 text-white" /> : <Volume2 className="w-3 h-3 text-white" />}
                               <input type="range" min="0" max="1" step="0.1" value={participantVolumes[uid] ?? 1} onChange={(e) => setParticipantVolumes({...participantVolumes, [uid]: parseFloat(e.target.value)})} className="w-full h-1 accent-emerald-500 rounded-full appearance-none bg-white/20" />
                            </div>
                        </div>
                    </div>
                 ))}
             </div>
         </div>
      )}

      <input type="file" accept="video/*" ref={fileInputRef} className="hidden" onChange={handleVideoUpload} />

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-emerald-500/10 blur-[80px]" />
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-[1024px] flex flex-col p-6 font-sans mt-4">
        <motion.header className="flex flex-col sm:flex-row sm:items-center justify-between px-8 py-5 mb-6 liquid-glass gap-4">
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold tracking-tighter text-white flex items-center whitespace-nowrap">
              H studio <span className="text-white/30 mx-3 font-normal">/</span> H chat
              {isGlobalAdmin && <span className="text-red-500 text-lg ml-2 flex items-center gap-1">🛡️ ADMIN OWNER</span>}
              {(isGlobalAdmin || betaFeaturesWorldwide) && (
                <button onClick={() => setShowAdminPanel(true)} className="ml-4 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-100 px-3 py-1.5 rounded-[16px] border border-red-500/30 flex items-center gap-1 transition-colors font-bold">
                  <Terminal className="w-3.5 h-3.5" /> {isGlobalAdmin ? 'Admin Panel' : 'Beta Features'}
                </button>
              )}
            </h1>
            <p className="text-[10px] text-emerald-400 font-bold mt-1.5 flex items-center gap-1.5">
               <ShieldCheck className="w-3 h-3" /> Security Protocol v50.9.1 Active
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 text-xs font-semibold tracking-wider uppercase border rounded-full transition-all flex items-center gap-2 ${mode === 'chat' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-white/5 border-white/10 text-[#9fb0d0]'}`}>
               {status}
            </div>
            <motion.div animate={{ opacity: status === 'Connected' ? [0.5, 1, 0.5] : 1 }} transition={{ duration: 2, repeat: status === 'Connected' ? Infinity : 0 }} className={`w-3 h-3 rounded-full transition-all duration-500 ${status === 'Connected' ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]' : 'bg-white/20'}`} />
          </div>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-[600px]">
          <motion.div className="lg:col-span-2 flex flex-col gap-6">
            <div className="flex-1 p-8 liquid-glass flex flex-col overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl pointer-events-none" />
              
              <AnimatePresence mode="wait">
                {mode === 'login' && (
                  <motion.div key="login" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 flex-1 flex flex-col justify-center py-4">
                    <div className="text-center space-y-2 mb-2">
                      <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30"><ShieldCheck className="w-8 h-8 text-blue-400" /></div>
                      <h2 className="text-2xl font-bold">Secure Access</h2>
                      <p className="text-sm text-[#9fb0d0]">Select your preferred portal to access isolated, encrypted rooms.</p>
                    </div>

                    <div className="flex bg-black/40 p-1.5 rounded-[16px] border border-white/5 gap-1 shrink-0">
                      <button onClick={() => setLoginMethod('google')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${loginMethod === 'google' ? 'bg-white/10 text-white' : 'text-[#9fb0d0]/60 hover:text-white'}`}>
                        Google Sign-In
                      </button>
                      <button onClick={() => setLoginMethod('hmail')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${loginMethod === 'hmail' ? 'bg-white/10 text-white' : 'text-[#9fb0d0]/60 hover:text-white'}`}>
                        Hmail Account Secure
                      </button>
                    </div>

                    {loginMethod === 'google' ? (
                      <button onClick={handleLogin} className="w-full py-4 px-6 rounded-2xl bg-white text-black hover:bg-white/90 backdrop-blur-md font-bold shadow-xl transition-all flex items-center justify-center gap-3"><img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" /> Sign In with Google</button>
                    ) : (
                      <form onSubmit={handleHmailLoginOrRegister} className="space-y-4">
                        {isHmailRegister && (
                          <div className="space-y-1.5 text-left">
                            <label className="text-[10px] text-[#9fb0d0] font-bold">Your Display Name</label>
                            <input type="text" placeholder="e.g. Brother Name" required className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-[16px] text-white outline-none focus:border-blue-400/50 transition-colors text-xs font-sans" value={hmailRegisterName} onChange={e => setHmailRegisterName(e.target.value)} />
                          </div>
                        )}

                        <div className="space-y-1.5 text-left">
                          <label className="text-[10px] text-[#9fb0d0] font-bold">Hmail Address / Username</label>
                           <div className="flex">
                             <input type="text" placeholder="e.g. brother" required className="w-full bg-black/40 border border-white/10 px-4.5 py-3 rounded-l-xl text-white outline-none focus:border-blue-400/50 transition-all text-xs font-mono" value={hmailEmail} onChange={e => setHmailEmail(e.target.value)} />
                             <span className="bg-white/5 border border-white/10 border-l-0 px-3.5 py-3 rounded-r-xl flex items-center text-[#9fb0d0]/50 font-mono text-xs select-none">
                               @hmail.com
                             </span>
                           </div>
                        </div>

                        <div className="space-y-1.5 text-left">
                          <label className="text-[10px] text-[#9fb0d0] font-bold">Password</label>
                          <input type="password" placeholder="••••••••" required className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-[16px] text-white outline-none focus:border-blue-400/50 transition-colors text-xs font-mono" value={hmailPassword} onChange={e => setHmailPassword(e.target.value)} />
                        </div>

                        <button type="submit" className="w-full py-4 px-6 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 text-white font-bold shadow-xl transition-all flex items-center justify-center gap-2 text-xs font-mono">
                          <Key className="w-4 h-4" />
                          {isHmailRegister ? 'Register & Enter Network' : 'Access Secure Channel'}
                        </button>

                        <div className="text-center">
                          <button type="button" onClick={() => setIsHmailRegister(!isHmailRegister)} className="text-[11px] text-[#9fb0d0]/80 hover:text-white transition-colors underline decoration-dotted">
                            {isHmailRegister ? 'Already registered? Log in here' : 'Need an Hmail account? Sign up here'}
                          </button>
                        </div>
                      </form>
                    )}
                    
                    <div className="bg-white/5 border border-white/10 p-4 rounded-[16px] mt-2">
                       <h4 className="text-xs font-bold text-[#9fb0d0] flex items-center gap-1.5 mb-2"><Info className="w-3 h-3" /> Data Retention</h4>
                       <p className="text-[10px] text-[#9fb0d0]/70 leading-relaxed">
                          Your conversations optionally reside locally in your browser to maintain privacy. Data is encrypted prior to transmission.
                       </p>
                    </div>
                  </motion.div>
                )}

                {mode === 'initial' && (
                  <motion.div key="initial" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                    <div>
                      <h2 className="text-xl font-semibold mb-2">Manage Connection</h2>
                      <p className="text-sm text-[#9fb0d0] leading-relaxed">Create a secure group channel or join an existing session.</p>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-[#9fb0d0]">Your Identity</label>
                      <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-black/40 border border-white/10 focus:border-blue-400/50 outline-none text-white transition-all" />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={createRoom} className="flex-1 py-4 px-6 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 font-bold shadow-lg shadow-blue-600/20 transition-all">New Room</button>
                      <button onClick={() => setMode('join')} className="flex-1 py-4 px-6 rounded-2xl border border-white/20 hover:bg-white/5 font-bold transition-all shadow-lg">Join Room</button>
                    </div>

                    <div className="pt-4 border-t border-white/10 mt-4 space-y-4">
                       <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-emerald-400">Trusted Contacts</h4>
                       </div>
                       
                       <div className="flex gap-2">
                           <input type="email" value={newContactEmail} onChange={(e) => setNewContactEmail(e.target.value)} placeholder="Add contact by email..." className="flex-1 px-4 py-2 rounded-[16px] bg-black/40 border border-white/10 text-xs text-white outline-none focus:border-emerald-500/50" />
                           <button onClick={addContact} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-[16px] text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 text-white">Add</button>
                       </div>

                       {contacts.length > 0 && (
                          <div className="space-y-3">
                             <div className="relative">
                               <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9fb0d0]/50" />
                               <input type="text" value={contactSearchQuery} onChange={(e) => setContactSearchQuery(e.target.value)} placeholder="Search contacts..." className="w-full pl-9 pr-4 py-2 rounded-[16px] bg-black/40 border border-white/10 text-xs text-white outline-none focus:border-emerald-500/50" />
                             </div>
                             <div className="space-y-2 max-h-[140px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-2">
                                {contacts.filter(c => c.name?.toLowerCase().includes(contactSearchQuery.toLowerCase()) || c.email?.toLowerCase().includes(contactSearchQuery.toLowerCase())).map((contact, index) => (
                                   <div key={`${contact.uid}-${index}`} className="p-3 bg-black/30 border border-white/5 rounded-[16px] flex items-center justify-between hover:bg-black/50 transition-colors group">
                                      <div className="min-w-0 mr-2">
                                         <p className="text-xs font-semibold text-white truncate">{contact.name}</p>
                                         <p className="text-[10px] text-[#9fb0d0] truncate mt-0.5">{contact.email}</p>
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                          <button onClick={() => startDirectMessage(contact)} className="px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-[10px] uppercase font-bold tracking-widest rounded-lg transition-colors">Chat</button>
                                          <button onClick={() => removeContact(contact.uid)} title="Remove Contact" className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                                       </div>
                                   </div>
                                ))}
                             </div>
                          </div>
                       )}

                       {directRooms.length > 0 && (
                          <div className="pt-4 border-t border-white/10">
                            <h4 className="text-xs font-bold text-blue-400 mb-3">Active Direct Messages</h4>
                            <div className="space-y-2 max-h-[140px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-2">
                               {directRooms.map((dr, index) => {
                                  const nameList = Object.entries(dr.participants).filter(([uid]) => uid !== user?.uid).map(([_, name]) => name);
                                  const otherName = nameList.length > 0 ? nameList[0] : 'Unknown';
                                  return (
                                    <div key={`${dr.id}-${index}`} className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-[16px] flex items-center justify-between hover:bg-blue-500/20 transition-colors group">
                                      <div className="min-w-0 mr-2 flex items-center gap-2">
                                         <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                         <p className="text-xs font-bold text-white truncate">Chat w/ {otherName}</p>
                                      </div>
                                      <button onClick={() => {
                                         setRoom(dr);
                                         setMode('chat');
                                         setStatus('Connected');
                                         saveRoomToLocal(dr);
                                      }} className="px-3 py-1.5 bg-white/10 text-white group-hover:bg-white/20 text-[10px] uppercase font-bold tracking-widest rounded-[16px] transition-colors flex-shrink-0">Open</button>
                                    </div>
                                  );
                               })}
                            </div>
                          </div>
                       )}
                    </div>

                    <div className="pt-4 border-t border-white/10 mt-4 text-left space-y-4">
                       <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-[#9fb0d0] flex items-center gap-1.5"><Globe className="w-3 h-3" /> Discoverability</h4>
                            <p className="text-[10px] text-[#9fb0d0]/80 mt-1">Allow others to add you via email for direct messages.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={allowDirectMessages} onChange={toggleAllowDirectMessages} className="sr-only peer" />
                            <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                          </label>
                       </div>

                       <div className="flex items-center justify-between mb-4 border-t border-white/10 pt-4">
                          <div>
                            <h4 className="text-xs font-bold text-[#9fb0d0] flex items-center gap-1.5"><Database className="w-3 h-3" /> PWA Persistence</h4>
                            <p className="text-[10px] text-[#9fb0d0]/80 mt-1">Save access to your history locally across app reloads.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={saveHistory} onChange={toggleSaveHistory} className="sr-only peer" />
                            <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                          </label>
                       </div>

                       {saveHistory && savedRooms.length > 0 && (
                          <div className="space-y-2 max-h-[160px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-2">
                             {savedRooms.map((sr, index) => (
                                <div key={`${sr.id}-${index}`} className="p-3 bg-black/30 border border-white/5 rounded-[16px] flex items-center justify-between hover:bg-black/50 transition-colors">
                                   <div>
                                      <p className="text-xs font-semibold text-white">{sr.hostName}'s Group</p>
                                      <p className="text-[10px] text-[#9fb0d0] font-mono mt-0.5">ID: {sr.code}</p>
                                   </div>
                                   <button onClick={() => { setJoinCode(sr.code); joinRoom(sr.code); }} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-bold rounded-[16px] transition-colors text-white">Rejoin</button>
                                </div>
                             ))}
                          </div>
                       )}
                    </div>
                  </motion.div>
                )}

                {mode === 'host' && (
                  <motion.div key="host" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                    <div>
                      <button onClick={() => { setMode('initial'); setRoom(null); }} className="text-xs text-blue-400 hover:underline mb-2 opacity-70 hover:opacity-100 transition-opacity">← Reset Session</button>
                      <h2 className="text-xl font-semibold mb-2">Inviting Guests</h2>
                      <p className="text-sm text-[#9fb0d0] leading-relaxed">Share this unique code to let others join the group.</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-black/50 border border-white/5 relative group">
                      <label className="block mb-2 text-xs font-bold text-blue-400">Your Room Code</label>
                      <div className="text-3xl font-mono tracking-[0.3em] text-center py-4 bg-white/5 rounded-[16px] border border-white/10 text-white shadow-inner mb-6">{room?.code}</div>
                      
                      {room?.code && (
                        <div className="flex flex-col items-center justify-center mb-6">
                           <div className="p-4 bg-white rounded-2xl shadow-xl flex items-center justify-center w-48 h-48">
                             <QRCode value={`${window.location.origin}${window.location.pathname}?room=${room.code}`} size={160} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
                           </div>
                           <p className="mt-3 text-xs text-[#9fb0d0] text-center max-w-xs">Scan or click link to join instantly without typing the code.</p>
                        </div>
                      )}

                      <button onClick={copyCode} className={`w-full py-4 rounded-[16px] font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${copied ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                        {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Invite Code</>}
                      </button>
                    </div>
                  </motion.div>
                )}

                {mode === 'join' && (
                  <motion.div key="join" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                    <div>
                      <button onClick={() => setMode('initial')} className="text-xs text-blue-400 hover:underline mb-2 opacity-70 transition-opacity">← Back</button>
                      <h2 className="text-xl font-semibold mb-2">Access Session</h2>
                      <p className="text-sm text-[#9fb0d0] leading-relaxed">Enter the 10-digit group code provided by the host.</p>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-emerald-400">Access Key</label>
                      <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))} className="w-full px-5 py-4 rounded-2xl bg-black/40 border border-white/10 focus:border-emerald-400/50 outline-none text-white text-center font-mono text-2xl tracking-[0.1em]" />
                    </div>
                    <button onClick={() => joinRoom()} className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold transition-all">Connect to Room</button>
                  </motion.div>
                )}

                {mode === 'chat' && (
                  <motion.div key="chat-settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="p-5 rounded-2xl bg-black/30 border border-white/5">
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center ${useEncryption ? 'bg-emerald-400/20 text-emerald-400 border-emerald-400/30' : 'bg-red-400/20 text-red-400 border-red-400/30'} border`}>
                             {useEncryption ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                           </div>
                           <div>
                             <h3 className="font-bold text-white uppercase text-xs tracking-widest">E2E Config</h3>
                             <p className={`text-[10px] ${useEncryption ? 'text-emerald-400/80' : 'text-red-400/80'}`}>{useEncryption ? 'AES-256 Active' : 'Plain Text'}</p>
                           </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={useEncryption} onChange={() => setUseEncryption(!useEncryption)} className="sr-only peer" />
                          <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>

                      {saveHistory && (
                        <div className="flex items-center justify-between py-2 border-b border-white/5 mb-3">
                          <p className="text-[10px] uppercase font-bold tracking-widest text-[#9fb0d0] flex items-center gap-1"><Database className="w-3 h-3"/> Auto-Save On</p>
                          <button onClick={downloadChat} className="px-3 py-1.5 rounded-[16px] bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 transition-colors"><Download className="w-3 h-3" /> Backup Log</button>
                        </div>
                      )}

                      <div className="space-y-2 mt-2">
                        <p className="text-[10px] text-[#9fb0d0] uppercase font-bold tracking-widest opacity-70 mb-2">Group Roster ({(room?.participants && Object.keys(room.participants).length) || 1})</p>
                        {room?.participants && Object.entries(room.participants).map(([id, name], index) => (
                           <div key={`${id}-${index}`} className={`flex items-center justify-between text-xs font-semibold ${id === user?.uid ? 'text-blue-400' : 'text-white'}`}>
                               <span className="truncate">{name} {id === user?.uid && '(You)'} {room.hostId === id && ' 👑'} {id === user?.uid && isGlobalAdmin && ' 🛡️'}</span>
                               {(room.hostId === user?.uid || isGlobalAdmin) && id !== user?.uid && (
                                   <button title="Remove/Ban Participant" onClick={() => banUser(id)} className="p-1.5 rounded-[16px] bg-red-500/10 text-red-400 hover:bg-red-500/20 flex-shrink-0 transition-colors"><UserX className="w-3 h-3" /> </button>
                               )}
                           </div>
                        ))}
                      </div>
                      
                      {isGlobalAdmin && (
                         <div className="mt-4 pt-4 border-t border-red-500/20">
                             <h4 className="text-[10px] font-bold text-red-400 mb-2 flex items-center gap-1.5"><ShieldAlert className="w-3 h-3"/> Beta / Admin Controls</h4>
                             <button onClick={async () => {
                                 if(!room) return;
                                 if(confirm('Force close this room for everyone?')) {
                                     await updateDoc(doc(db, 'rooms', room.id), { status: 'closed' });
                                 }
                             }} className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-[16px] text-xs font-bold transition-all border border-red-500/30">Force Close Room</button>
                         </div>
                      )}
                    </div>

                    <button onClick={handleLogout} className="w-full py-4 px-6 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold transition-all">Leave Session</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Right Panel: Chat Interface */}
          <motion.div className="lg:col-span-3 flex flex-col p-8 liquid-glass relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5 relative z-10 gap-2">
              <div>
                <h3 className="text-lg font-semibold text-white">{room?.id ? `Group ALPHA-${room.id.slice(-4).toUpperCase()}` : 'Secure Chat'}</h3>
                <p className="text-xs text-[#9fb0d0] flex items-center gap-1.5 mt-1">
                  <span className={`w-1.5 h-1.5 rounded-full shadow-sm ${mode === 'chat' ? 'bg-emerald-400 shadow-emerald-400/50 animate-pulse' : 'bg-white/20'}`} />
                  {mode === 'chat' ? `Connected to ${Object.keys(room?.participants || {}).length} people` : 'No active session'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                 {mode === 'chat' && (
                   <div className="flex bg-black/40 rounded-[16px] p-1 border border-white/5 shadow-inner">

                       <button title="Start Audio Call" onClick={() => toggleCall(false)} className={`p-2 rounded-lg transition-colors ${inCall && callType === 'audio' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-transparent hover:bg-white/10 text-[#9fb0d0] hover:text-white'}`}>
                          {inCall && callType === 'audio' ? <PhoneOff className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                       </button>
                       <button title="Start Video Call" onClick={() => toggleCall(true)} className={`p-2 rounded-lg transition-colors ${inCall && callType === 'video' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-transparent hover:bg-white/10 text-[#9fb0d0] hover:text-white'}`}>
                          {inCall && callType === 'video' ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                       </button>
                       {inCall && callType === 'video' && (
                         <button title="Share Screen" onClick={toggleScreenShare} className={`p-2 rounded-lg transition-colors ml-1 ${isScreenSharing ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-transparent hover:bg-white/10 text-[#9fb0d0] hover:text-white'}`}>
                            {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <MonitorUp className="w-4 h-4" />}
                         </button>
                       )}
                   </div>
                 )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 space-y-4 overflow-y-auto mb-6 pr-2 relative z-10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {messages.filter(m => !decodeMessage(m.text, room?.code || '').type.includes('signal')).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30 mt-10">
                  <div className="w-16 h-16 rounded-full border border-dashed border-white/30 flex items-center justify-center bg-white/5"><Send className="w-6 h-6" /></div>
                  <div className="space-y-1">
                    <p className="text-lg font-semibold tracking-tight">Silent Chat</p>
                    <p className="text-[10px] max-w-[200px] mx-auto opacity-70 uppercase tracking-widest">Group room established. Waiting for first transmission.</p>
                  </div>
                </div>
              ) : (
                messages.filter(m => !decodeMessage(m.text, room?.code || '').type.includes('signal')).map((msg, index) => {
                  const decoded = decodeMessage(msg.text, room?.code || '');
                  return (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                      animate={{ opacity: 1, scale: 1, y: 0 }} 
                      key={`${msg.id}-${index}`} 
                      className={`flex flex-col ${msg.senderId === user?.uid ? 'items-end' : 'items-start'} group/msg relative mb-2 w-full`}
                    >
                      {/* Hover Quick-Reactions Panel */}
                      <div className={`opacity-0 group-hover/msg:opacity-100 focus-within:opacity-100 transition-all duration-200 absolute -top-4 z-20 flex gap-1.5 bg-slate-900 border border-white/10 px-2 py-1 rounded-full backdrop-blur-md shadow-2xl ${
                        msg.senderId === user?.uid ? 'right-4' : 'left-4'
                      }`}>
                        {['❤️', '👍', '😂', '😮', '😢', '🔥'].map((emoji, index) => {
                          const userReacted = msg.reactions?.[emoji]?.includes(user?.uid || '');
                          return (
                            <button 
                              type="button"
                              key={`${emoji}-${index}`}
                              onClick={() => toggleReaction(msg.id, emoji)}
                              className={`text-sm hover:scale-125 transition-transform active:scale-95 duration-100 ${
                                userReacted ? 'brightness-125 scale-110 drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]' : 'opacity-70 hover:opacity-100'
                              }`}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                      </div>

                      <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-lg flex flex-col gap-1 relative ${
                        msg.senderId === user?.uid ? 'bg-blue-500/80 backdrop-blur-[32px] saturate-[180%] text-white border border-blue-400/30 rounded-br-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),_0_8px_16px_rgba(59,130,246,0.3)]' : 'bg-black/[0.15] backdrop-blur-[32px] saturate-[180%] text-white border border-white/10 rounded-bl-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_8px_16px_rgba(0,0,0,0.3)]'
                      }`}>
                        {decoded.type === 'audio' && <audio controls src={decoded.content} className="h-10 w-[240px]" />}
                        {decoded.type === 'video' && <video controls src={decoded.content} className="max-w-[260px] rounded-[16px] max-h-[300px] bg-black/40" />}
                        {decoded.type === 'text' && <p>{decoded.content}</p>}
                        
                        <span className={`text-[9px] mt-1 flex items-center gap-1 font-bold uppercase tracking-tighter ${msg.senderId === user?.uid ? 'text-white/60' : 'text-[#9fb0d0]/60'}`}>
                          {msg.senderId === user?.uid && isGlobalAdmin && <ShieldAlert className="w-3 h-3 text-red-500" />}
                          {msg.senderId === user?.uid ? 'You' : msg.senderName} • {msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                          {decoded.isEncrypted && <Lock className="w-3 h-3 ml-0.5" />}
                        </span>
                      </div>

                      {/* Render Active Reactions Summary Badges */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1 pr-1 pl-1 ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                          {Object.entries(msg.reactions as Record<string, string[]> || {})
                            .filter(([_, val]) => val && (val as string[]).length > 0)
                            .map(([emoji, val], index) => {
                              const uids = val as string[] || [];
                              const userReacted = uids.includes(user?.uid || '');
                              return (
                                <button 
                                  type="button"
                                  key={`${emoji}-${index}`} 
                                  onClick={() => toggleReaction(msg.id, emoji)}
                                  title={uids.map(id => room?.participants[id] || 'Someone').join(', ')}
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all border ${
                                    userReacted 
                                      ? 'bg-blue-500/20 border-blue-400/30 text-blue-300 font-bold hover:bg-blue-500/30' 
                                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                                  }`}
                                >
                                  <span className="text-xs">{emoji}</span>
                                  <span className="text-[9px] font-bold">{uids.length}</span>
                                </button>
                              );
                            })}
                        </div>
                      )}
                    </motion.div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Typing Indicator */}
            {room && room.typing && (
               <div className="absolute bottom-[80px] left-8">
                  {Object.entries(room.typing)
                     .filter(([uid, ts]) => uid !== user?.uid && Date.now() - (ts as number) < 3000)
                     .map(([uid]) => room.participants[uid] || 'Someone').length > 0 && (
                     <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-[#9fb0d0]/70 italic flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-md">
                        <span className="flex gap-1">
                           <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }} className="w-1 h-1 bg-[#9fb0d0]/70 rounded-full"></motion.span>
                           <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1 h-1 bg-[#9fb0d0]/70 rounded-full"></motion.span>
                           <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1 h-1 bg-[#9fb0d0]/70 rounded-full"></motion.span>
                        </span>
                        {Object.entries(room.typing).filter(([uid, ts]) => uid !== user?.uid && Date.now() - (ts as number) < 3000).map(([uid]) => room.participants[uid] || 'Someone').slice(0, 3).join(', ')} 
                        {Object.entries(room.typing).filter(([uid, ts]) => uid !== user?.uid && Date.now() - (ts as number) < 3000).length > 3 ? '...' : ''} is typing
                     </motion.div>
                  )}
               </div>
            )}

            {/* Footer Input Area */}
            <form onSubmit={sendMessage} className="flex gap-2 relative z-10 items-end mt-auto">
              <button 
                type="button" 
                disabled={mode !== 'chat'} 
                title="Send Video File"
                onClick={() => fileInputRef.current?.click()}
                className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[#9fb0d0] hover:text-white disabled:opacity-30 flex-shrink-0"
              >
                <FileVideo className="h-5 w-5" />
              </button>
              
              <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl flex items-center overflow-hidden focus-within:border-blue-400/50 transition-all">
                <input 
                  type="text" 
                  value={messageText} 
                  onChange={(e) => { setMessageText(e.target.value); handleTyping(); }} 
                  disabled={mode !== 'chat'}
                  placeholder={mode === 'chat' ? (useEncryption ? "Encrypted message..." : "Unencrypted message...") : "Connect to start..."}
                  className="w-full px-5 py-4 bg-transparent outline-none text-white disabled:opacity-50 text-sm"
                />
              </div>

              <motion.button 
                whileHover={{ scale: (mode === 'chat' && (messageText.trim() || isRecording)) ? 1.05 : 1 }}
                whileTap={{ scale: (mode === 'chat' && (messageText.trim() || isRecording)) ? 0.95 : 1 }}
                type="submit"
                onClick={(e) => {
                  if (!messageText.trim()) { e.preventDefault(); if (isRecording) stopRecording(); else startRecording(); }
                }}
                disabled={mode !== 'chat'}
                className={`p-3.5 rounded-2xl shadow-xl transition-all disabled:opacity-50 flex items-center justify-center flex-shrink-0
                  ${isRecording ? 'bg-red-500 hover:bg-red-400' : (messageText.trim() ? 'bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20' : 'bg-emerald-600 hover:bg-emerald-500')}
                `}
              >
                {isRecording ? <Square className="h-5 w-5 text-white" /> : (messageText.trim() ? <Send className="h-5 w-5 text-white" /> : <Mic className="h-5 w-5 text-white" />)}
              </motion.button>
            </form>
          </motion.div>
        </div>

        {/* Disclaimer / Privacy Statement */}
        <PrivacyFooter />
      </motion.div>
          </div>
        )}
        {activeAppTab === 'mail' && <HMailUI setActiveAppTab={setActiveAppTab} />}
        {activeAppTab === 'meet' && user && <HMeetUI currentUser={user} setActiveAppTab={setActiveAppTab} />}


      {/* Admin Panel Modal */}
      <AnimatePresence>
        {isGlobalAdmin && showAdminPanel && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-4xl bg-[#0a0f1d] border border-red-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-white/10 flex flex-col gap-4 bg-white/5 relative">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Settings2 className="w-6 h-6 text-red-500" />
                    Terminal Console
                  </h2>
                  <button
                    onClick={() => setShowAdminPanel(false)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-[16px] transition-colors text-white/70 flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center gap-4 border-b border-white/5 pb-2">
                  <button onClick={() => setAdminTab('actions')} className={`pb-2 px-1 text-sm font-bold transition-colors border-b-2 ${adminTab === 'actions' ? 'border-red-500 text-red-500' : 'border-transparent text-white/50 hover:text-white'}`}>Admin Actions</button>
                  <button onClick={() => setAdminTab('beta')} className={`pb-2 px-1 text-sm font-bold transition-colors border-b-2 ${adminTab === 'beta' ? 'border-red-500 text-red-500' : 'border-transparent text-white/50 hover:text-white'}`}>Beta Features</button>
                  <button onClick={() => setAdminTab('banlist')} className={`pb-2 px-1 text-sm font-bold transition-colors border-b-2 ${adminTab === 'banlist' ? 'border-red-500 text-red-500' : 'border-transparent text-white/50 hover:text-white'}`}>Ban List</button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                {adminTab === 'actions' && (
                  <div className="space-y-6">
                    <div className="bg-black/40 border border-red-500/20 rounded-2xl p-6">
                      <h3 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Global Broadcast System
                      </h3>
                      <p className="text-xs text-[#9fb0d0] mb-4">Send a high-priority push notification to all connected users.</p>
                      <div className="flex gap-3">
                        <input 
                          type="text" 
                          value={broadcastInput} 
                          onChange={(e) => setBroadcastInput(e.target.value)} 
                          placeholder="Enter broadcast message protocol..." 
                          className="flex-1 px-4 py-3 bg-black/60 border border-white/10 focus:border-red-500/50 rounded-[16px] outline-none text-white font-mono text-sm"
                        />
                        <button onClick={sendBroadcast} className="px-6 py-3 bg-red-500/80 hover:bg-red-500 backdrop-blur-md border border-red-500/50 text-white font-bold rounded-[16px] text-xs transition-colors whitespace-nowrap shadow-sm border border-white/5">
                          Dispatch
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {adminTab === 'beta' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 text-white lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {ADMIN_FEATURES.map((feature, index) => {
                      // Automatically show "ON" active state if it's the global toggle and worldwide is on, else use global active features state
                      const isActive = feature.isGlobalToggle ? betaFeaturesWorldwide : !!activeBetaFeatures[feature.id];
                      return (
                      <div onClick={() => toggleBetaFeature(feature.id)} key={`${feature.id}-${index}`} className={`bg-black/40 border ${isActive ? 'border-red-500 shadow-sm border border-white/5 bg-red-500/10' : 'border-white/5'} rounded-2xl p-4 flex flex-col gap-2 hover:bg-black/60 hover:border-red-500/30 transition-all cursor-pointer group hover:scale-[1.02]`}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`p-2 rounded-[16px] ${isActive ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-400 group-hover:bg-red-500/20'}`}>
                            <feature.icon className="w-4 h-4" />
                          </div>
                          <h3 className="font-bold text-xs uppercase tracking-wider">{feature.name}</h3>
                        </div>
                        <p className="text-[10px] text-[#9fb0d0]/70 leading-relaxed font-mono">
                          {feature.desc}
                        </p>
                        <div className="mt-auto pt-3 flex items-center justify-between">
                           <span className="text-[9px] text-red-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">{isActive ? 'ACTIVE' : 'Beta Feature'}</span>
                           <div className={`w-8 h-4 rounded-full relative ${isActive ? 'bg-red-500' : 'bg-white/10'}`}>
                             <div className={`w-3 h-3 rounded-full absolute top-[2px] transition-all ${isActive ? 'left-[18px] bg-white' : 'left-[2px] bg-white/40 group-hover:bg-red-400 group-hover:left-[6px]'}`}></div>
                           </div>
                        </div>
                      </div>
                    )})}
                  </div>
                )}
                {adminTab === 'banlist' && (
                  <div className="space-y-6">
                    <div className="bg-black/40 border border-red-500/20 rounded-2xl p-6">
                      <h3 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
                        <UserMinus className="w-4 h-4" /> Banned Users Control
                      </h3>
                      <p className="text-xs text-[#9fb0d0] mb-4">Enter an email to permanently ban a user from the platform (HChat / Hmail / HMeet).</p>
                      <form className="flex gap-3" onSubmit={async (e) => {
                        e.preventDefault();
                        if (!banInput.trim() || !banInput.includes('@')) return;
                        try {
                           await addDoc(collection(db, 'banned_emails'), { email: banInput.trim().toLowerCase() });
                           setBanInput('');
                        } catch(err) { console.error(err); }
                      }}>
                        <input 
                          type="text" 
                          value={banInput} 
                          onChange={(e) => setBanInput(e.target.value)} 
                          placeholder="Email address to ban..."
                          className="flex-1 bg-black/60 border border-red-500/30 px-4 py-3 rounded-[16px] text-red-100 text-sm focus:outline-none focus:border-red-400 font-mono"
                        />
                        <button 
                          type="submit"
                          className="bg-red-500/80 hover:bg-red-500 backdrop-blur-md border border-red-500/50 text-white px-6 rounded-[16px] font-bold text-xs transition-colors flex items-center gap-2"
                        >
                          Ban User
                        </button>
                      </form>
                    </div>
                    
                    <div className="bg-black/40 border border-white/5 rounded-2xl p-6">
                      <h3 className="text-sm font-bold text-white mb-4">Currently Banned Emails</h3>
                      {bannedEmails.length === 0 ? (
                         <div className="text-white/30 text-xs italic">No blocked emails found.</div>
                      ) : (
                         <div className="space-y-2">
                           {bannedEmails.map(b => (
                              <div key={b.id} className="flex items-center justify-between p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                                 <span className="font-mono text-sm text-red-300">{b.email}</span>
                                 <button onClick={async () => await deleteDoc(doc(db, 'banned_emails', b.id))} className="text-[10px] uppercase font-bold text-red-500 hover:text-red-400 tracking-wider">Unban</button>
                              </div>
                           ))}
                         </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Global Broadcast Overlay */}
      <AnimatePresence>
        {broadcastMessage && broadcastMessage.timestamp > dismissedBroadcast && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] max-w-[90vw] sm:max-w-md w-full"
          >
            <div className="bg-red-600 border border-red-400/50 rounded-2xl shadow-[0_10px_40px_rgba(239,68,68,0.8)] overflow-hidden flex flex-col p-1">
               <div className="flex items-center justify-between px-4 py-2 border-b border-white/20">
                 <span className="text-xs font-bold text-white flex items-center gap-2">
                   <ShieldAlert className="w-4 h-4" /> System Broadcast
                 </span>
                 <button onClick={() => setDismissedBroadcast(broadcastMessage.timestamp)} className="text-white/70 hover:text-white p-1 rounded-[16px] hover:bg-white/10">✕</button>
               </div>
               <div className="p-4 text-white font-medium text-sm text-center">
                 {broadcastMessage.text}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {appAlert && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 right-6 max-w-sm w-full z-[999]"
          >
            <div className="bg-[#1e293b]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 text-sm font-medium text-slate-100 mt-0.5">
                  {appAlert}
                </div>
                <button 
                  onClick={() => setAppAlert(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex justify-end mt-1">
                <button 
                  onClick={() => setAppAlert(null)}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 rounded-lg transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
    </div>
  );
}
