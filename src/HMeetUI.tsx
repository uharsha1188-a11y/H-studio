import React, { useState, useEffect, useRef } from 'react';
import CryptoJS from 'crypto-js';
import { db } from './lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  arrayUnion,
  addDoc
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  User, 
  Copy, 
  Check, 
  Search, 
  Activity, 
  RefreshCw, 
  Sparkles, 
  Clock, 
  VolumeX, 
  Volume2, 
  X, 
  UserCheck,
  Shield, 
  Grid,
  Send,
  MessageSquare,
  Wifi,
  WifiOff,
  Lock,
  Unlock,
  Calendar,
  Bell,
  LayoutDashboard
} from 'lucide-react';
import { PrivacyFooter } from './App';

interface HMeetUIProps {
  currentUser: any;
  setActiveAppTab: (tab: 'home' | 'chat' | 'mail' | 'meet') => void;
}

interface HMeetUser {
  uid: string;
  name: string;
  email: string;
  phoneNum: string;
}

interface ActiveCall {
  id: string;
  callerUid: string;
  callerPhone: string;
  callerName: string;
  receiverUid: string;
  receiverPhone: string;
  status: 'ringing' | 'accepted' | 'rejected' | 'ended';
  type: 'audio' | 'video';
  createdAt: number;
  
  callerMuted?: boolean;
  callerVideoDisabled?: boolean;
  receiverMuted?: boolean;
  receiverVideoDisabled?: boolean;
  
  callerSignal?: any;
  receiverSignal?: any;
  callerCandidates?: any[];
  receiverCandidates?: any[];
  
  chatMessages?: Array<{
    sender: string;
    senderName: string;
    text: string;
    time: number;
  }>;
}

export default function HMeetUI({ currentUser, setActiveAppTab }: HMeetUIProps) {
  // Phone Number state
  const [myPhoneNum, setMyPhoneNum] = useState<string>('');
  const [isProvisioning, setIsProvisioning] = useState<boolean>(false);
  
  // Contacts & Search
  const [allUsers, setAllUsers] = useState<HMeetUser[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Keypad Dial State
  const [dialNumber, setDialNumber] = useState<string>('');
  const [dialError, setDialError] = useState<string>('');
  
  // Call States
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<ActiveCall | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [networkQuality, setNetworkQuality] = useState<'good' | 'fair' | 'poor' | 'unknown'>('unknown');
  const [networkLatency, setNetworkLatency] = useState<number | null>(null);
  const [networkPacketLoss, setNetworkPacketLoss] = useState<number | null>(null);
  const [copysuccess, setCopysuccess] = useState<boolean>(false);
  const [isCallSettingUp, setIsCallSettingUp] = useState<boolean>(false);
  const [e2eeEnabled, setE2eeEnabled] = useState<boolean>(true);
  const [e2eeSupported, setE2eeSupported] = useState<boolean>(true);
  const e2eeEnabledRef = useRef<boolean>(true);

  // WebRTC Connection Recovery & Auto-Reconnect States/Refs
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [reconnectAttempt, setReconnectAttempt] = useState<number>(0);
  const isReconnectingRef = useRef<boolean>(false);
  const lastProcessedCallerSdpRef = useRef<string | null>(null);
  const lastProcessedReceiverSdpRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    e2eeEnabledRef.current = e2eeEnabled;
  }, [e2eeEnabled]);

  const setupE2EE = (senderOrReceiver: any, secretKey: string, isSender: boolean) => {
    if (!senderOrReceiver || !senderOrReceiver.createEncodedStreams) {
      console.warn("Insertable streams not supported on this device/browser");
      setE2eeSupported(false);
      return;
    }
    try {
      setE2eeSupported(true);
      const { readable, writable } = senderOrReceiver.createEncodedStreams();
      const keyBytes = new TextEncoder().encode(secretKey);
      const keyLength = keyBytes.length;

      const transformStream = new TransformStream({
        transform(chunk, controller) {
          try {
            if (e2eeEnabledRef.current && keyLength > 0) {
              const originalData = new Uint8Array(chunk.data);
              const newData = new Uint8Array(originalData.length);
              
              const offset = 10;
              for (let i = 0; i < originalData.length; i++) {
                if (i >= offset) {
                  newData[i] = originalData[i] ^ keyBytes[(i - offset) % keyLength];
                } else {
                  newData[i] = originalData[i];
                }
              }
              chunk.data = newData.buffer;
            }
            controller.enqueue(chunk);
          } catch (e) {
            console.error("Error transforming frame:", e);
            controller.enqueue(chunk);
          }
        }
      });

      readable.pipeThrough(transformStream).pipeTo(writable).catch((err: any) => {
        console.error("Insertable streams pipeline error:", err);
      });
      console.log(`E2EE pipeline successfully initialized for ${isSender ? 'sender' : 'receiver'}`);
    } catch (error) {
      console.error("Failed to setup E2EE insertable streams:", error);
    }
  };

  const triggerActiveReconnection = async (pc: RTCPeerConnection, sessionDocRef: any) => {
    if (!pcRef.current || pcRef.current !== pc) return;
    setReconnectAttempt(prev => {
      const nextAttempt = prev + 1;
      if (nextAttempt > 5) {
        console.warn("Max reconnection attempts reached. Hanging up call.");
        endCall();
        return prev;
      }
      
      console.log(`Initiating WebRTC ICE restart. Attempt ${nextAttempt}/5`);
      
      (async () => {
        try {
          processedCandidatesRef.current.clear();
          
          const offer = await pc.createOffer({ iceRestart: true });
          await pc.setLocalDescription(offer);
          
          await updateDoc(sessionDocRef, {
            callerSignal: { sdp: offer.sdp, type: offer.type },
            receiverSignal: null,
            receiverCandidates: [],
            callerCandidates: []
          });
          
          console.log("ICE Restart offer written to Firestore. Awaiting recipient response...");
        } catch (err) {
          console.error("Critical failure during active WebRTC reconnection setup:", err);
        }
      })();
      
      return nextAttempt;
    });
  };

  const addConnectionQualityAndReconnectHandlers = (pc: RTCPeerConnection, sessionDocRef: any, isCaller: boolean) => {
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log(`[ICE Connection State] [${isCaller ? 'Caller' : 'Receiver'}] changed to: ${state}`);
      
      if (state === 'disconnected') {
        setIsReconnecting(true);
        isReconnectingRef.current = true;
        
        if (isCaller) {
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isReconnectingRef.current && pcRef.current && pcRef.current.iceConnectionState !== 'connected' && pcRef.current.iceConnectionState !== 'completed') {
              triggerActiveReconnection(pc, sessionDocRef);
            }
          }, 3000);
        }
      } else if (state === 'failed') {
        setIsReconnecting(true);
        isReconnectingRef.current = true;
        if (isCaller) {
          triggerActiveReconnection(pc, sessionDocRef);
        }
      } else if (state === 'connected' || state === 'completed') {
        setIsReconnecting(false);
        isReconnectingRef.current = false;
        setReconnectAttempt(0);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`[Connection State] [${isCaller ? 'Caller' : 'Receiver'}] changed to: ${state}`);
      
      if (state === 'disconnected') {
        setIsReconnecting(true);
        isReconnectingRef.current = true;
      } else if (state === 'failed') {
        setIsReconnecting(true);
        isReconnectingRef.current = true;
        if (isCaller) {
          triggerActiveReconnection(pc, sessionDocRef);
        }
      } else if (state === 'connected') {
        setIsReconnecting(false);
        isReconnectingRef.current = false;
        setReconnectAttempt(0);
      }
    };
  };

  const getE2eeFingerprint = () => {
    if (!activeCall) return 'N/A';
    return CryptoJS.SHA256(activeCall.id).toString().substring(0, 12).toUpperCase().match(/.{1,4}/g)?.join('-') || 'N/A';
  };

  const getFrequentCallers = () => {
    const counts: Record<string, { name: string; number: string; count: number; lastType: 'audio' | 'video' }> = {};
    callHistory.forEach(entry => {
      const num = entry.number;
      if (!num) return;
      if (!counts[num]) {
        counts[num] = {
          name: entry.name || 'Unknown Subscriber',
          number: num,
          count: 0,
          lastType: entry.type || 'video'
        };
      }
      counts[num].count += 1;
    });

    const frequencyList = Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Fallback if empty or sparse history: populate from online directory
    if (frequencyList.length < 3) {
      const existingNumbers = new Set(frequencyList.map(item => item.number));
      const suggestionsNeeded = 4 - frequencyList.length;
      let addedCount = 0;
      
      for (const usr of allUsers) {
        if (addedCount >= suggestionsNeeded) break;
        if (!existingNumbers.has(usr.phoneNum) && usr.phoneNum !== myPhoneNum) {
          frequencyList.push({
            name: usr.name,
            number: usr.phoneNum,
            count: 0, // 0 means suggested contact
            lastType: 'video'
          });
          existingNumbers.add(usr.phoneNum);
          addedCount++;
        }
      }
    }

    return frequencyList;
  };

  const getRemainingTimeStr = (targetTime: number) => {
    const diffMs = targetTime - Date.now();
    if (diffMs <= 0) return "Due / Now";
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m remaining`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h remaining`;
    return `${Math.floor(diffHours / 24)}d remaining`;
  };
  
  // Meeting live chat state
  const [chatInput, setChatInput] = useState<string>('');
  
  // Signaling & WebRTC Replacement Refs (No physical peer connections needed)
  const localStreamRef = useRef<MediaStream | null>(null);
  const [localStreamState, setLocalStreamState] = useState<MediaStream | null>(null);
  const [remoteStreamState, setRemoteStreamState] = useState<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const processedCandidatesRef = useRef<Set<string>>(new Set());
  const callUnsubscribeRef = useRef<(() => void) | null>(null);
  const ringtoneOscRefs = useRef<any[]>([]);
  const lastCallTimeRef = useRef<Record<string, number>>({});
  const audioContextRef = useRef<AudioContext | null>(null);

  // --- PERSIST RECENT CALL HISTORY ---
  const [callHistory, setCallHistory] = useState<any[]>([]);

  // --- SCHEDULED CALLS ---
  interface ScheduledCall {
    id: string;
    callerUid: string;
    callerName: string;
    callerPhone: string;
    receiverPhone: string;
    receiverName?: string;
    scheduledTime: number;
    type: 'audio' | 'video';
    status: 'pending' | 'completed' | 'cancelled';
  }
  const [scheduledCalls, setScheduledCalls] = useState<ScheduledCall[]>([]);
  const [directoryTab, setDirectoryTab] = useState<'dashboard' | 'directory' | 'scheduled'>('dashboard');
  const [scheduleForm, setScheduleForm] = useState<{ phone: string; date: string; time: string; type: 'audio'|'video' }>({
    phone: '',
    date: '',
    time: '',
    type: 'video'
  });

  const [activeReminders, setActiveReminders] = useState<ScheduledCall[]>([]);
  const [dismissedReminders, setDismissedReminders] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`hmeet_dismissed_reminders_${currentUser?.uid}`) || '[]');
    } catch {
      return [];
    }
  });

  // Reminders chime generator
  const playReminderSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5 - E5 - G5 - C6
      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.1);
        gain.gain.setValueAtTime(0.001, ctx.currentTime + index * 0.1);
        gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + index * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.1 + 0.35);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + index * 0.1);
        osc.stop(ctx.currentTime + index * 0.1 + 0.4);
      });
    } catch (e) {
      console.warn("Audio init failed for reminder chime: ", e);
    }
  };

  const handleDismissReminder = async (callId: string) => {
    try {
      await updateDoc(doc(db, 'hmeet_scheduled_calls', callId), { status: 'completed' });
    } catch (e) {
      console.error("Failed to update status on dismissal:", e);
    }
    const updated = [...dismissedReminders, callId];
    setDismissedReminders(updated);
    localStorage.setItem(`hmeet_dismissed_reminders_${currentUser?.uid}`, JSON.stringify(updated));
    setActiveReminders(prev => prev.filter(c => c.id !== callId));
  };

  const handleStartReminderCall = async (call: ScheduledCall) => {
    await handleDismissReminder(call.id);
    const targetPhone = call.callerUid === currentUser.uid ? call.receiverPhone : call.callerPhone;
    makeCall(targetPhone, call.type);
  };

  // Check scheduled calls to see if they've come due
  useEffect(() => {
    if (!currentUser || scheduledCalls.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      // Look for pending calls that are due (up to 1 hour back so historical calls don't trigger alerts infinitely)
      const dueCalls = scheduledCalls.filter(call => {
        const isPending = call.status === 'pending';
        // Check window: is scheduledTime <= now AND not older than 1 hour?
        const isTimeArrived = call.scheduledTime <= now && call.scheduledTime > now - 3600000;
        const alreadyDismissed = dismissedReminders.includes(call.id);
        return isPending && isTimeArrived && !alreadyDismissed;
      });

      if (dueCalls.length > 0) {
        setActiveReminders(prev => {
          const existingIds = prev.map(c => c.id);
          const brandNew = dueCalls.filter(c => !existingIds.includes(c.id));
          if (brandNew.length > 0) {
            playReminderSound();
            return [...prev, ...brandNew];
          }
          return prev;
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [scheduledCalls, dismissedReminders, currentUser]);


  useEffect(() => {
    const historical = localStorage.getItem(`hmeet_history_${currentUser?.uid}`);
    if (historical) {
      try { setCallHistory(JSON.parse(historical)); } catch(e) {}
    }
  }, [currentUser]);

  const addToHistory = (name: string, num: string, type: 'audio'|'video', direct: 'incoming'|'outgoing'|'missed') => {
    const newEntry = {
      id: Math.random().toString(),
      name,
      number: num,
      type,
      direction: direct,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const updated = [newEntry, ...callHistory].slice(0, 15);
    setCallHistory(updated);
    localStorage.setItem(`hmeet_history_${currentUser?.uid}`, JSON.stringify(updated));
  };

  // --- SYNTHESIZE RINGTONE / ALERT SOUNDS (Pure Legal WebAudio) ---
  const stopAllAudio = () => {
    try {
      ringtoneOscRefs.current.forEach(item => {
        try { item.osc.stop(); } catch(e) {}
      });
      ringtoneOscRefs.current = [];
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
    } catch (e) {
      console.error(e);
    }
  };

  const playSynthesizedSound = (mode: 'ringback' | 'inbound' | 'connected' | 'hangup') => {
    stopAllAudio();
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      if (mode === 'ringback') {
        // Classic US Ringback tone: 440Hz + 480Hz modulated
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.value = 440;
        osc2.frequency.value = 480;
        osc1.type = 'sine';
        osc2.type = 'sine';

        gain.gain.setValueAtTime(0, ctx.currentTime);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();

        ringtoneOscRefs.current = [{ osc: osc1 }, { osc: osc2 }];

        let active = true;
        const pulse = () => {
          if (!active || ctx.state === 'closed') return;
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.setValueAtTime(0, ctx.currentTime + 1.8);
          setTimeout(pulse, 4000);
        };
        pulse();

        return () => {
          active = false;
          stopAllAudio();
        };
      } 
      else if (mode === 'inbound') {
        // Elegant Apple-like electronic ringtone sequence
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        ringtoneOscRefs.current = [{ osc }];

        let active = true;
        let pitchIndex = 0;
        const pitches = [880, 987, 1046, 1318];
        
        const playRingSequence = () => {
          if (!active || ctx.state === 'closed') return;
          const now = ctx.currentTime;
          pitches.forEach((freq, idx) => {
            gain.gain.setValueAtTime(0.06, now + idx * 0.15);
            gain.gain.setValueAtTime(0, now + idx * 0.15 + 0.1);
            osc.frequency.setValueAtTime(freq, now + idx * 0.15);
          });
          setTimeout(playRingSequence, 2000);
        };
        playRingSequence();

        return () => {
          active = false;
          stopAllAudio();
        };
      } 
      else if (mode === 'connected') {
        // Double-beep indicating connection established
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.1, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        setTimeout(() => { try { osc.stop(); if (ctx.state !== 'closed') ctx.close(); } catch(e) {} }, 500);
      } 
      else if (mode === 'hangup') {
        // Descending warm beep indicating termination
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.45);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        setTimeout(() => { try { osc.stop(); if (ctx.state !== 'closed') ctx.close(); } catch(e) {} }, 500);
      }
    } catch(err) {
      console.warn("Audio Context init blocked or failed: ", err);
    }
  };

  // --- PROVISION FREE & UNIQUE PHONE NUMBER ---
  useEffect(() => {
    if (!currentUser) return;

    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsub = onSnapshot(userDocRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.phoneNum) {
          setMyPhoneNum(data.phoneNum);
        } else {
          // If no phone num exists, pick/create a unique one for them!
          await provisionUniquePhoneNumber();
        }
      } else {
        await provisionUniquePhoneNumber();
      }
    });

    return () => unsub();
  }, [currentUser]);

  const provisionUniquePhoneNumber = async () => {
    if (isProvisioning) return;
    setIsProvisioning(true);

    try {
      let unique = false;
      let generatedNum = '';
      let attempts = 0;

      while (!unique && attempts < 5) {
        attempts++;
        // Create 8 digit string from 11111111 to 99999999
        generatedNum = String(Math.floor(10000000 + Math.random() * 90000000));
        
        // Confirm uniqueness in database
        const q = query(collection(db, 'users'), where('phoneNum', '==', generatedNum));
        const res = await getDocs(q);
        
        if (res.empty) {
          unique = true;
        }
      }

      if (unique) {
        await setDoc(doc(db, 'users', currentUser.uid), {
          phoneNum: generatedNum
        }, { merge: true });
        setMyPhoneNum(generatedNum);
      } else {
        // Fallback static fallback for local test
        const fallback = String(Math.floor(10000000 + Math.random() * 90000000));
        await setDoc(doc(db, 'users', currentUser.uid), {
          phoneNum: fallback
        }, { merge: true });
        setMyPhoneNum(fallback);
      }
    } catch (e) {
      console.error("Failed to provision online number: ", e);
    } finally {
      setIsProvisioning(false);
    }
  };

  // --- REGENERATE / FORCE ASSIGN ANOTHER ONLINE NUMBER (Unique check) ---
  const regeneratePhoneNumber = async () => {
    if (isProvisioning) return;
    if (window.confirm("Are you sure you want to change your online phone number? This will disconnect your active connection profile.")) {
      setIsProvisioning(true);
      try {
        let unique = false;
        let generatedNum = '';
        let attempts = 0;

        while (!unique && attempts < 8) {
          attempts++;
          generatedNum = String(Math.floor(10000000 + Math.random() * 90000000));
          const q = query(collection(db, 'users'), where('phoneNum', '==', generatedNum));
          const res = await getDocs(q);
          if (res.empty) unique = true;
        }

        if (unique) {
          await setDoc(doc(db, 'users', currentUser.uid), { phoneNum: generatedNum }, { merge: true });
          setMyPhoneNum(generatedNum);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsProvisioning(false);
      }
    }
  };

  // --- LISTEN INCOMING CALL REQUESTS ---
  useEffect(() => {
    if (!myPhoneNum || !currentUser) return;

    const q = query(
      collection(db, 'hmeet_sessions'),
      where('receiverUid', '==', currentUser.uid),
      where('status', '==', 'ringing')
    );

    const unsubIncoming = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data() as ActiveCall;
        const callId = snapshot.docs[0].id;
        
        // Ensure it's not our own outgoing call and that we aren't already busy
        if (docData.callerUid !== currentUser.uid && !activeCall) {
          setIncomingCall({ ...docData, id: callId });
          playSynthesizedSound('inbound');
        }
      } else {
        setIncomingCall(null);
      }
    }, (err) => {
      console.error("Firestore Incoming Call Listener failed: ", err);
    });

    return () => {
      unsubIncoming();
    };
  }, [myPhoneNum, currentUser, activeCall]);

  // --- RETRIEVE ACTIVE DIRECTORY OF REGISTERED USERS ---
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const activeUsers: HMeetUser[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        if (d.phoneNum && d.uid !== currentUser.uid) {
          activeUsers.push({
            uid: d.uid,
            name: d.name || 'Anonymous Peer',
            email: d.email || '',
            phoneNum: d.phoneNum
          });
        }
      });
      setAllUsers(activeUsers);
    });
    return () => unsub();
  }, [currentUser]);

  // --- RETRIEVE SCHEDULED CALLS ---
  useEffect(() => {
    if (!currentUser || !myPhoneNum) return;
    const unsub = onSnapshot(collection(db, 'hmeet_scheduled_calls'), (snapshot) => {
      const calls: ScheduledCall[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as ScheduledCall;
        if (data.callerUid === currentUser.uid || data.receiverPhone === myPhoneNum || data.callerPhone === myPhoneNum) {
          calls.push({ ...data, id: docSnap.id });
        }
      });
      // Sort by scheduled Time
      calls.sort((a, b) => a.scheduledTime - b.scheduledTime);
      setScheduledCalls(calls);
    });
    return () => unsub();
  }, [currentUser, myPhoneNum]);

  // --- COOLDOWN TIMER FOR CALL DURATION ---
  useEffect(() => {
    if (activeCall && activeCall.status === 'accepted') {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setCallDuration(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeCall?.status]);

  // Copy number to clip
  const copyToClipboard = () => {
    navigator.clipboard.writeText(myPhoneNum);
    setCopysuccess(true);
    setTimeout(() => setCopysuccess(false), 2000);
  };

  // --- INSTANT COOSMIC HANDSHAKE SIGNALS CLEANUP ---
  const handleCallCleanup = () => {
    stopAllAudio();
    if (callUnsubscribeRef.current) {
      callUnsubscribeRef.current();
      callUnsubscribeRef.current = null;
    }

    // Stop and dereference Local Tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setLocalStreamState(null);
    setRemoteStreamState(null);

    // Close RTC Peer Connection
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch(e) {}
      pcRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsReconnecting(false);
    isReconnectingRef.current = false;
    setReconnectAttempt(0);
    lastProcessedCallerSdpRef.current = null;
    lastProcessedReceiverSdpRef.current = null;

    processedCandidatesRef.current.clear();
    setActiveCall(null);
    setIncomingCall(null);
    setIsCallSettingUp(false);
    setIsMuted(false);
    setIsVideoDisabled(false);
    setChatInput('');
  };

  // --- CALL ACTIONS: HANGUP / REJECT / DECLINE ---
  const endCall = async () => {
    const currentCall = activeCall || incomingCall;
    if (!currentCall) return;

    playSynthesizedSound('hangup');
    
    try {
      // Set status to ended in Firestore
      await updateDoc(doc(db, 'hmeet_sessions', currentCall.id), {
        status: 'ended'
      });
    } catch(e) {
      console.warn("Session doc might already be deleted", e);
    }

    handleCallCleanup();
  };

  const rejectCall = async () => {
    if (!incomingCall) return;

    playSynthesizedSound('hangup');

    try {
      await updateDoc(doc(db, 'hmeet_sessions', incomingCall.id), {
        status: 'rejected'
      });
    } catch(e) {
      console.error(e);
    }
    setIncomingCall(null);
  };

  // --- SATELLITE HANDSHAKE SIG: PLACE OUTGOING CALL ---
  const makeCall = async (targetPhone: string, type: 'audio' | 'video' = 'audio') => {
    if (!myPhoneNum) {
      setDialError("You don't have an online profile initialized.");
      return;
    }
    if (targetPhone === myPhoneNum) {
      setDialError("You cannot call your own number.");
      return;
    }

    const cleanedPhone = targetPhone.replace(/\s+/g, '');
    if (cleanedPhone.length !== 8 || isNaN(Number(cleanedPhone))) {
      setDialError("Please dial a valid 8-digit online number.");
      return;
    }

    // SPAM PROTECTION: Prevents accidental multi-clicks or rage-calling
    const now = Date.now();
    const lastCalledTime = lastCallTimeRef.current[cleanedPhone] || 0;
    if (now - lastCalledTime < 15000) {
      setDialError("Call request in progress. Please wait before dialing again to prevent network flooding.");
      return;
    }
    lastCallTimeRef.current[cleanedPhone] = now;

    setDialError("");
    setIsCallSettingUp(true);

    try {
      const q = query(collection(db, 'users'), where('phoneNum', '==', cleanedPhone));
      const matchDocs = await getDocs(q);

      if (matchDocs.empty) {
        setDialError(`Target Phone [${cleanedPhone}] is not active in database.`);
        setIsCallSettingUp(false);
        return;
      }

      const targetData = matchDocs.docs[0].data();
      const targetUid = targetData.uid;
      const targetName = targetData.name || 'Custom Operator';

      playSynthesizedSound('ringback');
      addToHistory(targetName, cleanedPhone, type, 'outgoing');

      // 1. Create dialing session document with synchronized control flags
      const sessionDocRef = doc(collection(db, 'hmeet_sessions'));
      const initialCallData: ActiveCall = {
        id: sessionDocRef.id,
        callerUid: currentUser.uid,
        callerPhone: myPhoneNum,
        callerName: currentUser.displayName || 'Guest User',
        receiverUid: targetUid,
        receiverPhone: cleanedPhone,
        status: 'ringing',
        type: type,
        createdAt: Date.now(),
        callerMuted: false,
        callerVideoDisabled: type === 'audio',
        receiverMuted: false,
        receiverVideoDisabled: type === 'audio',
        chatMessages: []
      };

      await setDoc(sessionDocRef, initialCallData);
      setActiveCall(initialCallData);

      // 2. Initialize Media Input Device
      const mediaConstraints = {
        audio: true,
        video: type === 'video' ? { width: 640, height: 480, facingMode: 'user' } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      localStreamRef.current = stream;
      setLocalStreamState(stream);

      // 3. Configure Peer Connection with extended STUN array for maximum piercing chance AND insertable streams option for E2EE support
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ],
        encodedInsertableStreams: true
      } as any);
      pcRef.current = pc;

      // Add connection state & quality listeners for Auto-reconnect
      addConnectionQualityAndReconnectHandlers(pc, sessionDocRef, true);

      // Add local Media tracks and setup E2EE transforms
      stream.getTracks().forEach(track => {
        const sender = pc.addTrack(track, stream);
        setupE2EE(sender, sessionDocRef.id, true);
      });

      // Handle ICE Candidates
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          updateDoc(sessionDocRef, {
            callerCandidates: arrayUnion(e.candidate.toJSON())
          }).catch(console.error);
        }
      };

      // Handle incoming Remote Track with E2EE decryptor transform
      pc.ontrack = (e) => {
        if (e.receiver) {
          setupE2EE(e.receiver, sessionDocRef.id, false);
        }
        if (e.streams && e.streams[0]) {
          setRemoteStreamState(e.streams[0]);
        }
      };

      // 4. Create and upload SDP Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      lastProcessedCallerSdpRef.current = offer.sdp || null;
      lastProcessedReceiverSdpRef.current = null;

      await updateDoc(sessionDocRef, {
        callerSignal: { sdp: offer.sdp, type: offer.type }
      });

      // 5. Setup Ephemeral Live Handshake Sync on Firestore
      let offerAccepted = false;
      const unsub = onSnapshot(sessionDocRef, async (snapshot) => {
        if (!snapshot.exists()) {
          handleCallCleanup();
          return;
        }

        const data = snapshot.data() as ActiveCall;

        if (data.status === 'rejected') {
          alert('Call was declined / busy.');
          handleCallCleanup();
          return;
        }

        if (data.status === 'ended') {
          handleCallCleanup();
          return;
        }

        // Handle case where receiver requests ICE restart/reconnect by clearing receiverSignal
        if (data.status === 'accepted' && !data.receiverSignal && offerAccepted) {
          console.log("Caller: Detected receiver requested ICE restart/connection reset. Initiating active reconnect...");
          triggerActiveReconnection(pc, sessionDocRef);
        }

        if (data.status === 'accepted' && data.receiverSignal) {
          const sdpStr = data.receiverSignal.sdp;
          if (!offerAccepted || (sdpStr && sdpStr !== lastProcessedReceiverSdpRef.current)) {
            const isSubsequentAnswer = offerAccepted;
            offerAccepted = true;
            lastProcessedReceiverSdpRef.current = sdpStr;
            
            if (isSubsequentAnswer) {
              console.log("Applying ICE Restart / Sub reconnection SDP answer...");
            } else {
              stopAllAudio();
              playSynthesizedSound('connected');
            }
            
            await pc.setRemoteDescription(new RTCSessionDescription(data.receiverSignal));
            
            setIsReconnecting(false);
            isReconnectingRef.current = false;
            setReconnectAttempt(0);
            
            setActiveCall(prev => prev ? { 
              ...prev, 
              status: 'accepted',
              callerMuted: data.callerMuted ?? false,
              callerVideoDisabled: data.callerVideoDisabled ?? (data.type === 'audio'),
              receiverMuted: data.receiverMuted ?? false,
              receiverVideoDisabled: data.receiverVideoDisabled ?? (data.type === 'audio'),
              chatMessages: data.chatMessages || []
            } : null);

            // Drain any early buffered candidates
            if (data.receiverCandidates) {
              data.receiverCandidates.forEach(cand => {
                const candStr = JSON.stringify(cand);
                if (!processedCandidatesRef.current.has(candStr)) {
                  processedCandidatesRef.current.add(candStr);
                  pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
                }
              });
            }
          }
        }

        // Continually push candidate packets
        if (data.status === 'accepted' && data.receiverCandidates) {
          data.receiverCandidates.forEach(cand => {
            const candStr = JSON.stringify(cand);
            if (!processedCandidatesRef.current.has(candStr)) {
              processedCandidatesRef.current.add(candStr);
              pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
            }
          });
        }
      }, (err) => {
        console.error("Firestore caller stream subscription interrupted:", err);
      });

      callUnsubscribeRef.current = unsub;

    } catch(err) {
      console.error("Dialing Process critical crash: ", err);
      alert("Call Device Initialization Error: " + (err instanceof Error ? err.message : String(err)));
      handleCallCleanup();
    }
  };

  // --- SATELLITE HANDSHAKE SIG: ACCEPT INBOUND CALL ---
  const acceptIncomingCall = async () => {
    if (!incomingCall) return;

    try {
      stopAllAudio();
      playSynthesizedSound('connected');
      setIsCallSettingUp(true);
      addToHistory(incomingCall.callerName, incomingCall.callerPhone, incomingCall.type, 'incoming');

      // Bind active call values from inbound session info
      const sessionDocRef = doc(db, 'hmeet_sessions', incomingCall.id);
      console.log("DEBUG: Setting up peer connection.");
      setActiveCall({ 
        ...incomingCall, 
        status: 'accepted',
        callerMuted: incomingCall.callerMuted ?? false,
        callerVideoDisabled: incomingCall.callerVideoDisabled ?? (incomingCall.type === 'audio'),
        receiverMuted: false,
        receiverVideoDisabled: incomingCall.type === 'audio',
        chatMessages: incomingCall.chatMessages ?? []
      });
      setIncomingCall(null);

      // Allocate device capture
      console.log("DEBUG: Allocating device capture.");
      const consts = {
        audio: true,
        video: incomingCall.type === 'video' ? true : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(consts);
      localStreamRef.current = stream;
      setLocalStreamState(stream);
      console.log("DEBUG: Device capture successful.");

      // Build client WebRTC component with insertable streams E2EE support
      console.log("DEBUG: Building RTCPeerConnection.");
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ],
        encodedInsertableStreams: true
      } as any);
      pcRef.current = pc;

      // Add connection state & quality listeners for Auto-reconnect
      addConnectionQualityAndReconnectHandlers(pc, sessionDocRef, false);

      stream.getTracks().forEach(track => {
        const sender = pc.addTrack(track, stream);
        setupE2EE(sender, incomingCall.id, true);
      });

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          updateDoc(sessionDocRef, {
            receiverCandidates: arrayUnion(e.candidate.toJSON())
          }).catch(console.error);
        }
      };

      pc.ontrack = (e) => {
        if (e.receiver) {
          setupE2EE(e.receiver, incomingCall.id, false);
        }
        if (e.streams && e.streams[0]) {
          setRemoteStreamState(e.streams[0]);
        }
      };

      // Feed SDP Offer
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.callerSignal));
      
      // Build Answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      lastProcessedCallerSdpRef.current = incomingCall.callerSignal.sdp;
      lastProcessedReceiverSdpRef.current = answer.sdp;

      // Set state and upload signaling data
      await setDoc(sessionDocRef, {
        receiverSignal: { sdp: answer.sdp, type: answer.type },
        status: 'accepted',
        receiverMuted: false,
        receiverVideoDisabled: incomingCall.type === 'audio'
      }, { merge: true });

      // Handle incremental Ice Candidates
      const unsub = onSnapshot(sessionDocRef, async (snapshot) => {
        if (!snapshot.exists()) {
          handleCallCleanup();
          return;
        }

        const data = snapshot.data() as ActiveCall;
        if (data.status === 'ended') {
          handleCallCleanup();
          return;
        }

        if (data.status === 'accepted') {
          // If callerSignal SDP has changed (signaling an ICE restart/reconnection)
          if (data.callerSignal && data.callerSignal.sdp && data.callerSignal.sdp !== lastProcessedCallerSdpRef.current) {
            lastProcessedCallerSdpRef.current = data.callerSignal.sdp;
            console.log("Receiver: Detected ICE restart from caller. Regenerating SDP answer...");
            setIsReconnecting(true);
            try {
              if (pcRef.current) {
                // Clear any pre-existing local candidates and process the new offer
                processedCandidatesRef.current.clear();
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.callerSignal));
                const newAnswer = await pcRef.current.createAnswer();
                await pcRef.current.setLocalDescription(newAnswer);
                
                lastProcessedReceiverSdpRef.current = newAnswer.sdp;
                await updateDoc(sessionDocRef, {
                  receiverSignal: { sdp: newAnswer.sdp, type: newAnswer.type },
                  receiverCandidates: [],
                  callerCandidates: []
                });
              }
            } catch (err) {
              console.error("Receiver reconnect recovery failure:", err);
            }
          }

          setActiveCall(prev => prev ? {
            ...prev,
            callerMuted: data.callerMuted ?? false,
            callerVideoDisabled: data.callerVideoDisabled ?? (data.type === 'audio'),
            receiverMuted: data.receiverMuted ?? false,
            receiverVideoDisabled: data.receiverVideoDisabled ?? (data.type === 'audio'),
            chatMessages: data.chatMessages || []
          } : null);

          if (data.callerCandidates) {
            data.callerCandidates.forEach(cand => {
              const candStr = JSON.stringify(cand);
              if (!processedCandidatesRef.current.has(candStr)) {
                processedCandidatesRef.current.add(candStr);
                pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
              }
            });
          }
        }
      }, (err) => {
        console.error("Firestore receiver synchronization interrupted:", err);
      });

      callUnsubscribeRef.current = unsub;
      setIsCallSettingUp(false);

    } catch (err) {
      console.error("Unable to bind answer setup:", err);
      alert("Error Accept Call Media: " + (err instanceof Error ? err.message : String(err)));
      handleCallCleanup();
    }
  };

  // --- DISPATCH CALLER CHAT MESSAGE ---
  const sendChatMessage = async () => {
    if (!chatInput.trim() || !activeCall) return;
    try {
      const sessionDocRef = doc(db, 'hmeet_sessions', activeCall.id);
      const newMsg = {
        sender: currentUser.uid,
        senderName: currentUser.displayName || 'Authorized Peer',
        text: chatInput.trim(),
        time: Date.now()
      };
      await updateDoc(sessionDocRef, {
        chatMessages: arrayUnion(newMsg)
      });
      setChatInput('');
    } catch (e) {
      console.error("Could not send meet session message: ", e);
    }
  };

  // Synchronized Voice Mution
  const toggleMute = async () => {
    const currentCall = activeCall;
    if (!currentCall) return;

    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = !nextMuted;
    }

    try {
      const sessionDocRef = doc(db, 'hmeet_sessions', currentCall.id);
      if (currentCall.callerUid === currentUser.uid) {
        await updateDoc(sessionDocRef, { callerMuted: nextMuted });
      } else {
        await updateDoc(sessionDocRef, { receiverMuted: nextMuted });
      }
    } catch (e) {
      console.error("Mute state remote sync failed:", e);
    }
  };

  // Synchronized Video Blanks
  const toggleVideo = async () => {
    const currentCall = activeCall;
    if (!currentCall) return;

    const nextVideoDisabled = !isVideoDisabled;
    setIsVideoDisabled(nextVideoDisabled);

    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = !nextVideoDisabled;
    }

    try {
      const sessionDocRef = doc(db, 'hmeet_sessions', currentCall.id);
      if (currentCall.callerUid === currentUser.uid) {
        await updateDoc(sessionDocRef, { callerVideoDisabled: nextVideoDisabled });
      } else {
        await updateDoc(sessionDocRef, { receiverVideoDisabled: nextVideoDisabled });
      }
    } catch (e) {
      console.error("Video state remote sync failed:", e);
    }
  };

  // Digital keypad dial triggers
  const appendDial = (digit: string) => {
    if (dialNumber.length < 8) {
      setDialNumber(prev => prev + digit);
    }
  };

  const removeDialDigit = () => {
    setDialNumber(prev => prev.slice(0, -1));
  };

  // Timer and Network Quality Polling
  useEffect(() => {
    let timerInterval: NodeJS.Timeout | null = null;
    let statsInterval: NodeJS.Timeout | null = null;

    if (activeCall?.status === 'accepted') {
      timerInterval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      statsInterval = setInterval(async () => {
        if (!pcRef.current) return;
        try {
          const stats = await pcRef.current.getStats();
          let highestPacketLoss = 0;
          let currentRtt = 0;
          let hasStats = false;
          let hasRtt = false;
          
          stats.forEach(report => {
            if (report.type === 'inbound-rtp' && (report.kind === 'video' || report.kind === 'audio')) {
              hasStats = true;
              const packetsLost = report.packetsLost || 0;
              const packetsReceived = report.packetsReceived || 0;
              const totalPackets = packetsLost + packetsReceived;
              if (totalPackets > 0) {
                const lossRate = packetsLost / totalPackets;
                if (lossRate > highestPacketLoss) highestPacketLoss = lossRate;
              }
            }
            if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.currentRoundTripTime !== undefined) {
               hasRtt = true;
               currentRtt = report.currentRoundTripTime * 1000;
            }
          });

          if (hasStats) {
            setNetworkPacketLoss(Math.round(highestPacketLoss * 100));
            if (hasRtt) setNetworkLatency(Math.round(currentRtt));
            
            if (highestPacketLoss > 0.05 || (hasRtt && currentRtt > 500)) {
              setNetworkQuality('poor');
            } else if (highestPacketLoss > 0.02 || (hasRtt && currentRtt > 200)) {
              setNetworkQuality('fair');
            } else {
              setNetworkQuality('good');
            }
          } else {
            setNetworkQuality('good'); // default if stats aren't populated yet
          }
        } catch (e) {
          // ignore
        }
      }, 2000);
    } else {
      setCallDuration(0);
      setNetworkQuality('unknown');
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
      if (statsInterval) clearInterval(statsInterval);
    };
  }, [activeCall?.status]);

  // Formatted conversion of Elapsed Call state seconds
  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const startSchedulingForPartner = (phoneNum: string) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    // Set to 1 hour in the future
    today.setHours(today.getHours() + 1);
    const hh = String(today.getHours()).padStart(2, '0');
    const timeStr = `${hh}:00`;

    setScheduleForm({
      phone: phoneNum,
      date: dateStr,
      time: timeStr,
      type: 'video'
    });
    setDirectoryTab('scheduled');
  };

  const handleScheduleCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.phone || !scheduleForm.date || !scheduleForm.time) {
      alert("Please fill in all scheduling fields.");
      return;
    }
    const cleanPhone = scheduleForm.phone.replace(/\s+/g, '');
    if (cleanPhone.length !== 8 || isNaN(Number(cleanPhone))) {
      alert("Please enter a valid 8-digit online number.");
      return;
    }
    if (cleanPhone === myPhoneNum) {
      alert("You cannot schedule a call with yourself.");
      return;
    }
    
    const scheduledDateTime = new Date(`${scheduleForm.date}T${scheduleForm.time}`).getTime();
    if (scheduledDateTime < Date.now()) {
      alert("Cannot schedule a call in the past.");
      return;
    }

    try {
      const q = query(collection(db, 'users'), where('phoneNum', '==', cleanPhone));
      const res = await getDocs(q);
      let rName = 'Unknown Subscriber';
      if (!res.empty) {
        rName = res.docs[0].data().name || rName;
      }

      await addDoc(collection(db, 'hmeet_scheduled_calls'), {
        callerUid: currentUser.uid,
        callerName: currentUser.displayName || 'Guest User',
        callerPhone: myPhoneNum,
        receiverPhone: cleanPhone,
        receiverName: rName,
        scheduledTime: scheduledDateTime,
        type: scheduleForm.type,
        status: 'pending'
      });
      alert("Call scheduled successfully!");
      setScheduleForm({ phone: '', date: '', time: '', type: 'video' });
    } catch (err) {
      console.error(err);
      alert("Failed to schedule call.");
    }
  };

  // Filter Directory users
  const filteredUsers = allUsers.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.phoneNum && u.phoneNum.includes(searchQuery))
  );

  return (
    <div className="w-full max-w-5xl py-6 flex flex-col gap-8 relative" id="hmeet-main-pane">
      
      {/* ACTIVE REMINDERS NOTIFICATION HEADER BANNER */}
      <AnimatePresence>
        {activeReminders.map(rem => {
          const isMeCaller = rem.callerUid === currentUser.uid;
          const targetName = isMeCaller ? rem.receiverName : rem.callerName;
          const targetNumber = isMeCaller ? rem.receiverPhone : rem.callerPhone;
          return (
            <motion.div
              key={`alert-${rem.id}`}
              initial={{ height: 0, opacity: 0, scale: 0.95, y: -20 }}
              animate={{ height: 'auto', opacity: 1, scale: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, scale: 0.95, y: -20 }}
              className="w-full bg-gradient-to-r from-amber-500/10 to-indigo-600/15 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl shadow-indigo-950/20 text-left relative overflow-hidden group mb-2"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/15 transition-all duration-700 pointer-events-none" />
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-[16px] bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 animate-pulse">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] tracking-widest uppercase font-black text-amber-400 font-mono animate-pulse">● Due call reminder</span>
                    <span className="px-1.5 py-0.5 text-[8px] font-mono uppercase bg-amber-500/20 text-amber-300 font-bold border border-amber-500/20 rounded-md">
                      {rem.type}
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-white mt-0.5">
                    Your scheduled call with <span className="text-amber-300 font-sans">{targetName}</span> is due!
                  </h4>
                  <p className="text-[10px] text-[#9fb0d0]/75 font-mono mt-0.5">
                    Direct dial number: {targetNumber.slice(0, 4)} {targetNumber.slice(4)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto select-none">
                <button
                  onClick={() => handleDismissReminder(rem.id)}
                  className="px-3 py-2 hover:bg-white/5 border border-white/5 rounded-[16px] text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => handleStartReminderCall(rem)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[16px] text-xs font-bold shadow-lg shadow-indigo-950 flex items-center gap-1.5 transition-all cursor-pointer font-mono uppercase tracking-wider"
                >
                  <PhoneCall className="w-3.5 h-3.5" /> Direct Dial
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* 1. STATE INDICATOR OR PROVISION FLOW */}
      {isProvisioning && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center gap-4 text-center">
          <RefreshCw className="w-12 h-12 text-blue-400 animate-spin" />
          <p className="text-xl font-bold font-sans">Provisioning unique 8-Digit Hmeet Number...</p>
          <p className="text-[#aebecd] text-xs">Securing routing vectors on client grid</p>
        </div>
      )}

      {/* 2. INCOMING CALL FLOATING DIALOG OVERLAY */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="fixed bottom-6 right-6 z-[90] max-w-md w-[380px] bg-gradient-to-br from-indigo-950/90 to-[#0c0f24] border border-blue-500/40 rounded-[28px] p-6 shadow-2xl backdrop-blur-2xl text-left"
            id="incoming-call-box"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30 shrink-0">
                {incomingCall.type === 'video' ? <Video className="w-7 h-7 animate-pulse" /> : <PhoneCall className="w-7 h-7 animate-bounce" />}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs text-[#9fb0d0]/65 font-bold font-mono">Incoming call</p>
                <h3 className="text-lg font-extrabold text-white truncate font-sans">{incomingCall.callerName}</h3>
                <p className="font-mono text-xs text-blue-400">{incomingCall.callerPhone.slice(0,4)} {incomingCall.callerPhone.slice(4)}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3.5">
              <button 
                onClick={rejectCall} 
                className="px-5 py-3 rounded-[16px] border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-bold hover:bg-rose-500/20 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
              >
                <PhoneOff className="w-3.5 h-3.5" /> Decline
              </button>
              <button 
                onClick={acceptIncomingCall}
                className="px-6 py-3 rounded-[16px] bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-black shadow-[0_8px_16px_rgba(16,185,129,0.3)] hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" /> Accept Connection
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. ACTIVE CALL OVERLAY SCREEN (Ultra-Reliable Firestore HANDSHAKE ENGINE) */}
      <AnimatePresence>
        {activeCall && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-center"
            id="active-call-modal"
          >
            <div className="w-full max-w-5xl flex flex-col items-center h-full max-h-[90vh] justify-between">
              
              {/* Call Top Block details */}
              <div className="py-2 shrink-0">
                <div className="flex flex-col items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/10 text-xs font-extrabold tracking-widest text-indigo-300 uppercase font-mono shadow-md inline-flex items-center gap-2 select-none">
                    <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                    Hmeet Call Handshake Secured
                  </span>
                  
                  {e2eeEnabled ? (
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 inline-flex items-center gap-1.5 font-mono uppercase shadow-sm">
                        <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        E2EE Active
                      </span>
                      <span className="px-3 py-1 rounded-full text-[10px] font-semibold text-[#9fb0d0]/90 bg-white/5 border border-white/10 font-mono shadow-sm">
                        Verification Key: <span className="text-white select-all font-bold tracking-wider">{getE2eeFingerprint()}</span>
                      </span>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 inline-flex items-center gap-1.5 font-mono uppercase shadow-sm">
                        <Unlock className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                        E2EE Bypass Active
                      </span>
                    </div>
                  )}

                  {!e2eeSupported && (
                    <span className="mt-1 text-[9px] font-black font-mono uppercase tracking-wide text-amber-500 bg-amber-500/5 px-3 py-1 rounded-lg border border-amber-500/10 max-w-[400px]">
                      ⚠️ E2EE stream transform not supported by browser. Audio/Video fall back to standard WebRTC DTLS security.
                    </span>
                  )}
                </div>
                
                <h2 className="text-2xl font-black text-white mt-4 font-sans tracking-wide">
                  {activeCall.callerUid === currentUser.uid 
                    ? `Subscriber (${activeCall.receiverPhone})` 
                    : `${activeCall.callerName} (${activeCall.callerPhone})`}
                </h2>
                
                <p className="text-gray-400 text-xs mt-1 font-sans">
                  {activeCall.status === 'ringing' ? (
                    <span className="flex items-center gap-1.5 justify-center text-indigo-400">
                      <PhoneCall className="w-4 h-4 animate-bounce shrink-0" />
                      Contacting satellite node routing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-4 justify-center bg-black/20 py-1.5 px-3 rounded-full backdrop-blur-sm border border-white/5 w-fit mx-auto mt-2">
                      <span className="text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        {activeCall.status === 'accepted' ? formatTimer(callDuration) : '00:00'}
                      </span>
                      {activeCall.status === 'accepted' && networkQuality !== 'unknown' && (
                        <span className={`font-mono text-[10px] font-bold flex items-center gap-1 ${
                          networkQuality === 'good' ? 'text-emerald-400' : 
                          networkQuality === 'fair' ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {networkQuality === 'good' ? <Wifi className="w-3.5 h-3.5" /> : 
                           networkQuality === 'fair' ? <Wifi className="w-3.5 h-3.5 opacity-75" /> : 
                           <WifiOff className="w-3.5 h-3.5" />}
                          <span className="flex items-center gap-2">
                            {networkQuality.toUpperCase()}
                            {(networkLatency !== null || networkPacketLoss !== null) && (
                               <span className="opacity-70 ml-1">
                                 ({networkLatency !== null ? `${networkLatency}ms` : '--'} / {networkPacketLoss !== null ? `${networkPacketLoss}% loss` : '--'})
                               </span>
                            )}
                          </span>
                        </span>
                      )}
                    </span>
                  )}
                </p>
              </div>

              {/* Central Video Stream Canvasses & Chat Area */}
              <div className="flex-1 w-full max-h-[60vh] grid grid-cols-1 lg:grid-cols-12 gap-6 my-4 relative overflow-hidden text-left">
                {isReconnecting && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center select-none animate-fadeIn">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 animate-bounce">
                      <WifiOff className="w-8 h-8" />
                    </div>
                    <h3 className="text-sm font-black text-amber-400 font-mono">Telemetry Interrupted</h3>
                    <p className="text-xs text-[#9fb0d0]/70 max-w-sm mt-1.5 font-sans">
                      Transient network drop detected. Reestablishing WebRTC peer connection...
                    </p>
                    <div className="flex items-center gap-2 mt-4 px-3.5 py-1.5 bg-slate-900/60 border border-white/5 rounded-[16px] text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                      Status: Attempting Reconnect {reconnectAttempt > 0 ? `(${reconnectAttempt}/5)` : ''}
                    </div>
                  </div>
                )}
                
                {/* Visual Communication Feeds Column */}
                <div className={`col-span-1 ${activeCall.status === 'accepted' ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col gap-6 justify-center h-full`}>
                  {activeCall.type === 'video' && activeCall.status === 'accepted' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full items-center">
                      
                      {/* Remote Video Stream Card */}
                      <div className="w-full h-full min-h-[180px] bg-slate-900/60 rounded-3xl border border-white/10 overflow-hidden relative shadow-2xl flex items-center justify-center">
                        {remoteStreamState ? (
                          <video 
                            autoPlay 
                            playsInline 
                            ref={el => { if(el) el.srcObject = remoteStreamState; }} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="text-center p-6 flex flex-col items-center">
                            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center border border-white/10 mb-3 text-slate-400">
                              <User className="w-8 h-8 animate-pulse" />
                            </div>
                            <p className="text-xs font-semibold text-slate-300">Awaiting Peer Video...</p>
                          </div>
                        )}
                        <span className="absolute top-4 left-4 text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 bg-black/60 rounded-lg text-indigo-400 font-mono border border-indigo-500/20 backdrop-blur-md">
                          Remote feed
                        </span>
                      </div>

                      {/* Local Video Stream Card */}
                      <div className="w-full h-full min-h-[180px] bg-slate-900/60 rounded-3xl border border-white/10 overflow-hidden relative shadow-2xl flex items-center justify-center">
                        {localStreamState ? (
                          <video 
                            autoPlay 
                            playsInline 
                            muted 
                            ref={el => { if(el) el.srcObject = localStreamState; }} 
                            className={`w-full h-full object-cover ${isVideoDisabled ? 'opacity-0' : ''}`} 
                          />
                        ) : (
                          <div className="text-center p-6 flex flex-col items-center">
                            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center border border-white/10 mb-3 text-slate-400">
                              <User className="w-8 h-8 animate-pulse" />
                            </div>
                            <p className="text-xs font-semibold text-slate-300">Local Camera Offline</p>
                          </div>
                        )}
                        {isVideoDisabled && (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 backdrop-blur-md z-10 p-6 flex-col">
                            <VideoOff className="w-10 h-10 text-rose-400 mb-2" />
                            <p className="text-xs text-rose-200 font-medium">Camera shutter closed</p>
                          </div>
                        )}
                        <span className="absolute bottom-4 left-4 text-xs font-bold px-3 py-1 bg-slate-950/80 rounded-lg text-white font-sans backdrop-blur-md border border-white/10">
                          My Camera
                        </span>
                      </div>

                    </div>
                  ) : (
                    /* Pure Audio call graphic/animation */
                    <div className="flex-1 flex flex-col items-center justify-center my-6">
                      <div className="w-40 h-40 rounded-full bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center relative">
                        
                        {/* Visualizer Pulses */}
                        <span className="absolute inset-0 rounded-full bg-indigo-400/5 border border-indigo-400/10 animate-ping" />
                        <span className="absolute inset-4 rounded-full bg-indigo-400/10 animate-pulse" />
                        
                        <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-indigo-600/30 to-blue-600/40 flex items-center justify-center text-white shadow-xl relative z-10">
                          <Phone className="w-10 h-10 text-white animate-pulse" />
                        </div>
                      </div>
                      <p className="mt-6 text-xs text-indigo-400 font-bold font-mono">Satellite Audio Handshake Connected</p>
                    </div>
                  )}
                </div>

                {/* Right Column: Real-time Meet Instant Chat block */}
                {activeCall.status === 'accepted' && (
                  <div className="col-span-1 lg:col-span-4 bg-slate-900/70 border border-white/10 rounded-3xl p-4 flex flex-col h-[280px] lg:h-full overflow-hidden shadow-2xl relative">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2.5 mb-2.5 shrink-0">
                      <MessageSquare className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <h4 className="text-xs font-black text-emerald-300 font-mono">In-Meeting Secured Chat</h4>
                    </div>

                    {/* Scrollable messages panel */}
                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 custom-scroll">
                      {activeCall.chatMessages && activeCall.chatMessages.length > 0 ? (
                        activeCall.chatMessages.map((msg, index) => {
                          const isMe = msg.sender === currentUser.uid;
                          return (
                            <div key={index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <span className="text-[9px] text-[#9fb0d0]/50 font-mono mb-0.5">
                                {isMe ? 'Me' : msg.senderName}
                              </span>
                              <div className={`px-3 py-2 rounded-2xl text-xs max-w-[85%] break-words ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/5 text-slate-200 border border-white/5 rounded-tl-none'}`}>
                                {msg.text}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-600">
                          <p className="text-[11px] font-sans">No shared messages in this call yet.</p>
                        </div>
                      )}
                    </div>

                    {/* Chat submission form */}
                    <div className="mt-2.5 flex items-center gap-2 pt-2 border-t border-white/5 shrink-0">
                      <input 
                        type="text"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') sendChatMessage(); }}
                        placeholder="Type secure message..."
                        className="flex-1 bg-black/50 border border-white/10 rounded-[16px] px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:border-emerald-500/50 outline-none transition-all"
                      />
                      <button 
                        onClick={sendChatMessage}
                        className="p-2 rounded-[16px] bg-emerald-500 hover:bg-emerald-600 text-white transition-colors cursor-pointer shrink-0 animate-pulse"
                        title="Send Message"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

              </div>

              {/* Lower Control Actions rail */}
              <div className="py-4 flex items-center gap-5 shrink-0">
                {activeCall.status === 'accepted' && (
                  <>
                    {/* Mute Audio button */}
                    <button 
                      onClick={toggleMute} 
                      className={`p-4 rounded-full border border-white/10 transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/15'}`}
                      title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                    >
                      {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </button>

                    {/* Disable Video trigger */}
                    {activeCall.type === 'video' && (
                      <button 
                        onClick={toggleVideo} 
                        className={`p-4 rounded-full border border-white/10 transition-all ${isVideoDisabled ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/15'}`}
                        title={isVideoDisabled ? 'Enable webcam feed' : 'Disable webcam feed'}
                      >
                        {isVideoDisabled ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                      </button>
                    )}

                    {/* E2EE Stream Lock Toggle */}
                    <button 
                      onClick={() => setE2eeEnabled(!e2eeEnabled)} 
                      className={`p-4 rounded-full border border-white/10 transition-all ${e2eeEnabled ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/35 border-amber-500/30'}`}
                      title={e2eeEnabled ? 'End-to-End Encryption Enabled. Click to temporarily bypass.' : 'End-to-End Encryption Disabled. Click to restore encryptor.'}
                    >
                      {e2eeEnabled ? <Lock className="w-6 h-6 text-emerald-300" /> : <Unlock className="w-6 h-6" />}
                    </button>

                    {/* Simulate Network Drop & Auto-Reconnect */}
                    <button 
                      onClick={async () => {
                        if (pcRef.current && activeCall) {
                          console.log("Simulating network drop... Triggering WebRTC connection reset.");
                          setIsReconnecting(true);
                          isReconnectingRef.current = true;
                          const docRef = doc(db, 'hmeet_sessions', activeCall.id);
                          if (activeCall.callerUid === currentUser.uid) {
                            triggerActiveReconnection(pcRef.current, docRef);
                          } else {
                            await updateDoc(docRef, { receiverSignal: null });
                          }
                        }
                      }} 
                      className="p-4 rounded-full border border-white/10 bg-white/10 text-white hover:bg-white/15 hover:text-amber-400 transition-all"
                      title="Simulate Transient Network Drop & Trigger Auto-Reconnect"
                    >
                      <RefreshCw className={`w-6 h-6 ${isReconnecting ? 'animate-spin text-amber-500' : ''}`} />
                    </button>
                  </>
                )}

                {/* Always show red leave call button */}
                <button 
                  onClick={endCall} 
                  className="px-8 py-4 bg-rose-600 rounded-full text-white hover:bg-rose-700 transition-all flex items-center gap-2.5 font-bold shadow-lg shadow-rose-950 cursor-pointer"
                >
                  <PhoneOff className="w-5 h-5" /> End Call
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. MAIN WORKSPACE VIEW */}
      <div className="text-center relative z-10">
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-[16px] border border-indigo-500/20 bg-indigo-500/10 mb-4 select-none">
          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-300 font-mono">Hmeet Dialing Gateway</span>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-widest mb-2 uppercase">
          Hmeet Calls
        </h1>
        <p className="text-[#aebecd]/80 max-w-lg mx-auto text-sm leading-relaxed">
          Audio and video direct satellite connection. All routes secured with high-grade handshakes, live chat feeds, and ephemeral Firestore live matrix states.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        
        {/* LEFT COLUMN: PRIMARY PROFILE CARD & INTEGRATED DIRECTORY CONTACT DIAGRAMS */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* USER PROFILE INFO BANNER */}
          <div className="liquid-glass p-6 md:p-8 flex flex-col gap-5 text-left relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/15 transition-all duration-700 pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-[#9fb0d0]/65 font-bold font-mono">Hmeet Profile Assigned</p>
                <h3 className="text-2xl font-sans font-black text-white mt-1">{currentUser.displayName || 'Authorized Peer'}</h3>
                <p className="text-sm text-[#9fb0d0]/60 truncate max-w-sm">{currentUser.email}</p>
              </div>

              {/* Generates big digital view code display of phone */}
              <div className="flex flex-col items-start sm:items-end shrink-0">
                <span className="text-[10px] tracking-widest uppercase font-black text-blue-400 font-mono">Satellite phone number</span>
                <div className="mt-1 flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-[16px] px-4 py-2 font-mono text-xl font-bold text-white tracking-wide shadow-inner">
                  <span>{myPhoneNum ? `${myPhoneNum.slice(0, 4)} ${myPhoneNum.slice(4)}` : '0000 0000'}</span>
                  <button 
                    onClick={copyToClipboard} 
                    className="p-1.5 ml-1 text-blue-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
                    title="Copy to clipboard"
                  >
                    {copysuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-5 text-xs text-[#9fb0d0]/75">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-400" />
                <span>Encrypted direct-lookup registration verified.</span>
              </div>
              <button 
                onClick={regeneratePhoneNumber} 
                className="text-blue-400 hover:underline hover:text-blue-300 flex items-center gap-1.5 font-bold tracking-wider uppercase font-mono text-[10px] cursor-pointer"
                disabled={isProvisioning}
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" /> Reset profile number
              </button>
            </div>
          </div>

          {/* SATELLITE DIRECT DIRECTORY OR SCHEDULED */}
          <div className="liquid-glass p-6 text-left flex flex-col min-h-[460px] h-auto lg:h-[460px]">
            <div className="flex items-center gap-4 border-b border-white/5 pb-3 shrink-0">
              <button 
                onClick={() => setDirectoryTab('dashboard')} 
                className={`flex items-center gap-2 pb-3 -mb-3 border-b-2 transition-colors duration-150 ${directoryTab === 'dashboard' ? 'border-blue-400 text-blue-400 font-extrabold' : 'border-transparent text-slate-400 hover:text-white font-medium'}`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="text-sm tracking-tight">Dashboard</span>
              </button>
              <button 
                onClick={() => setDirectoryTab('directory')} 
                className={`flex items-center gap-2 pb-3 -mb-3 border-b-2 transition-colors duration-150 ${directoryTab === 'directory' ? 'border-blue-400 text-blue-400 font-extrabold' : 'border-transparent text-slate-400 hover:text-white font-medium'}`}
              >
                <UserCheck className="w-4 h-4" />
                <span className="text-sm tracking-tight">Directory</span>
                {allUsers.length > 0 && <span className="px-1.5 py-0.5 text-[8px] font-mono uppercase bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 rounded-full font-bold ml-1.5">{allUsers.length}</span>}
              </button>
              <button 
                onClick={() => setDirectoryTab('scheduled')} 
                className={`relative flex items-center gap-2 pb-3 -mb-3 border-b-2 transition-colors duration-150 ${directoryTab === 'scheduled' ? 'border-blue-400 text-blue-400 font-extrabold' : 'border-transparent text-slate-400 hover:text-white font-medium'}`}
              >
                <Clock className="w-4 h-4" />
                <span className="text-sm tracking-tight">Scheduled</span>
                {scheduledCalls.length > 0 && <span className="px-1.5 py-0.5 text-[8px] font-mono uppercase bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 rounded-full font-bold ml-1.5">{scheduledCalls.length}</span>}
                {activeReminders.length > 0 && (
                  <span className="absolute -top-0.5 -right-2 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 flex items-center justify-center text-[7px] font-extrabold text-white">{activeReminders.length}</span>
                  </span>
                )}
              </button>
            </div>

            {directoryTab === 'dashboard' && (
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 overflow-hidden h-full min-h-0">
                {/* TIMELINE COLUMN */}
                <div className="flex flex-col h-full min-h-0">
                  <div className="flex items-center gap-1.5 mb-2.5 shrink-0">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                    <h4 className="text-xs font-black text-[#9fb0d0]/90 font-mono">
                      Upcoming Timeline
                    </h4>
                    <span className="ml-auto text-[9px] font-mono text-slate-500 uppercase">
                      Chronological
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 pr-1.5 custom-scroll max-h-[310px]">
                    {(() => {
                      const upcoming = (scheduledCalls || [])
                        .filter(call => call.status === 'pending' && call.scheduledTime >= Date.now())
                        .sort((a, b) => a.scheduledTime - b.scheduledTime);

                      if (upcoming.length === 0) {
                        return (
                          <div className="h-full flex flex-col items-center justify-center text-center p-4 bg-white/[0.02] rounded-2xl border border-white/5 min-h-[220px]">
                            <Clock className="w-8 h-8 text-slate-500 mb-2.5 opacity-40 animate-pulse" />
                            <h5 className="text-[11px] font-bold text-white font-mono">No Scheduled Calls</h5>
                            <p className="text-[10px] text-[#9fb0d0]/50 mt-1 max-w-[180px] leading-normal font-sans">
                              Your upcoming line is clear. Plan calling sessions in the "Scheduled" tab.
                            </p>
                            <button 
                              onClick={() => setDirectoryTab('scheduled')}
                              className="mt-3 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 text-[9px] font-black font-mono transition-all cursor-pointer"
                            >
                              Add Schedule +
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="relative border-l border-dashed border-blue-500/30 ml-2 pl-4 py-1 space-y-4">
                          {upcoming.map((call) => {
                            const isCaller = call.callerUid === currentUser.uid;
                            const partnerName = isCaller ? (call.receiverName || 'Unknown Peer') : (call.callerName || 'Unknown Peer');
                            const partnerPhone = isCaller ? call.receiverPhone : call.callerPhone;
                            const timeRemaining = getRemainingTimeStr(call.scheduledTime);

                            return (
                              <div key={call.id} className="relative group/timeline">
                                {/* Timeline Bullet Node Indicator */}
                                <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-950 border-2 border-blue-400 group-hover/timeline:scale-125 transition-all outline outline-4 outline-slate-950/85 shadow-[0_0_8px_rgba(96,165,250,0.5)]" />

                                <div className="p-3 rounded-[16px] bg-white/[0.03] border border-white/5 hover:border-blue-500/20 transition-all">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="overflow-hidden">
                                      <div className="flex items-center gap-1.5">
                                        {call.type === 'video' ? (
                                          <Video className="w-3 h-3 text-blue-400 animate-pulse" />
                                        ) : (
                                          <Phone className="w-3 h-3 text-emerald-400 animate-pulse" />
                                        )}
                                        <span className="text-xs font-extrabold text-white truncate font-sans">
                                          {partnerName}
                                        </span>
                                      </div>
                                      <p className="text-[9px] font-mono text-slate-500 mt-0.5 select-all">
                                        No. {partnerPhone.slice(0, 4)} {partnerPhone.slice(4)}
                                      </p>
                                    </div>
                                    <span className="px-1.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[8px] font-sans font-black text-blue-400 shrink-0 uppercase tracking-wider">
                                      {timeRemaining}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/[0.04] text-[9px]">
                                    <span className="text-[9px] font-mono text-slate-400">
                                      {new Date(call.scheduledTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                    </span>
                                    <button 
                                      onClick={() => makeCall(partnerPhone, call.type)}
                                      className="px-2.5 py-1 rounded bg-[#0e1626] border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 font-black font-mono transition-all text-[8px] cursor-pointer"
                                      disabled={isCallSettingUp}
                                    >
                                      Connect
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* FREQUENT CALLERS COLUMN */}
                <div className="flex flex-col h-full min-h-0 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                  <div className="flex items-center gap-1.5 mb-2.5 shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <h4 className="text-xs font-black text-[#9fb0d0]/90 font-mono">
                      Frequent Callers
                    </h4>
                    <span className="ml-auto text-[9px] font-mono text-slate-500 uppercase">
                      Redial speed dials
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 custom-scroll max-h-[310px]">
                    {(() => {
                      const frequencies = getFrequentCallers();

                      if (frequencies.length === 0) {
                        return (
                          <div className="h-full flex flex-col items-center justify-center text-center p-4 bg-white/[0.02] rounded-2xl border border-white/5 min-h-[220px]">
                            <User className="w-8 h-8 text-slate-500 mb-2.5 opacity-40" />
                            <h5 className="text-[11px] font-bold text-white font-mono">No Call Activity</h5>
                            <p className="text-[10px] text-[#9fb0d0]/50 mt-1 max-w-[180px] leading-normal font-sans">
                              Your directory speed dials will populate here once you make or accept telemetry calls.
                            </p>
                          </div>
                        );
                      }

                      return frequencies.map((item, index) => {
                        return (
                          <div 
                            key={index}
                            className="flex items-center justify-between p-2 rounded-[16px] bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all group/frequent"
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-white/10 flex items-center justify-center text-indigo-400 text-xs font-bold font-sans shrink-0 uppercase">
                                {item.name.charAt(0)}
                              </div>
                              <div className="overflow-hidden">
                                <div className="flex items-center gap-1 max-w-full">
                                  <h5 className="text-xs font-bold text-white truncate font-sans">
                                    {item.name}
                                  </h5>
                                  {item.count > 0 && (
                                    <span className="px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[8px] rounded-full font-mono uppercase font-bold shrink-0">
                                      {item.count} {item.count === 1 ? 'call' : 'calls'}
                                    </span>
                                  )}
                                  {item.count === 0 && (
                                    <span className="px-1.5 py-0.5 bg-slate-500/10 border border-white/5 text-slate-400 text-[8px] rounded-full font-mono uppercase font-bold shrink-0">
                                      Suggested
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-[#9fb0d0]/60 select-all font-mono">
                                  {item.number.slice(0, 4)} {item.number.slice(4)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button 
                                onClick={() => makeCall(item.number, 'audio')}
                                className="p-1.5 rounded-lg bg-[#0e1626] border border-white/5 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-all cursor-pointer"
                                title="Quick Audio Call"
                                disabled={isCallSettingUp}
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => makeCall(item.number, 'video')}
                                className="p-1.5 rounded-lg bg-[#0e1626] border border-white/5 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-all cursor-pointer"
                                title="Quick Video Call"
                                disabled={isCallSettingUp}
                              >
                                <Video className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}

            {directoryTab === 'directory' && (
              <>
                {/* Filter search query input */}
                <div className="relative my-4 shrink-0">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search phone directory or names..." 
                    className="w-full bg-black/40 border border-white/10 px-4 py-2.5 pl-10 rounded-[16px] text-white outline-none focus:border-blue-400/50 text-xs transition-all font-sans"
                  />
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Users lists display container */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 custom-scroll">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map(usr => (
                      <div 
                        key={usr.uid} 
                        className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition-all group"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-[16px] bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 flex items-center justify-center border border-white/10 text-blue-400 shrink-0 font-sans font-bold">
                            {usr.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="text-sm font-extrabold text-white truncate font-sans">{usr.name}</h4>
                            <p className="font-mono text-xs text-blue-400 select-all">{usr.phoneNum.slice(0, 4)} {usr.phoneNum.slice(4)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 font-mono">
                          <button 
                            onClick={() => startSchedulingForPartner(usr.phoneNum)}
                            className="p-2.5 rounded-[16px] bg-white/5 border border-white/10 text-[#9fb0d0]/80 hover:bg-indigo-500/20 hover:text-indigo-400 hover:border-indigo-500/30 transition-all cursor-pointer"
                            title="Schedule Future Call"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => makeCall(usr.phoneNum, 'audio')}
                            className="p-2.5 rounded-[16px] bg-white/5 border border-white/10 text-[#9fb0d0]/80 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30 transition-all cursor-pointer"
                            title="Start Audio Call"
                            disabled={isCallSettingUp}
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => makeCall(usr.phoneNum, 'video')}
                            className="p-2.5 rounded-[16px] bg-white/5 border border-white/10 text-[#9fb0d0]/80 hover:bg-blue-500/20 hover:text-blue-400 hover:border-blue-500/30 transition-all cursor-pointer"
                            title="Start Video Call"
                            disabled={isCallSettingUp}
                          >
                            <Video className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center text-gray-500 font-mono">
                      <span className="text-4xl text-slate-700">☏</span>
                      <p className="text-xs font-sans mt-2">Zero matching online subscribers.</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {directoryTab === 'scheduled' && (
              <div className="flex flex-col h-full mt-4 overflow-y-auto custom-scroll pr-1">
                <form onSubmit={handleScheduleCall} className="mb-4 space-y-2.5 bg-black/20 p-3.5 rounded-[16px] border border-white/5 shrink-0">
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <select 
                        className="flex-1 bg-black/40 border border-white/10 px-3 py-2 rounded-lg text-white text-xs outline-none focus:border-blue-400/50 [color-scheme:dark]"
                        value={scheduleForm.phone}
                        onChange={e => setScheduleForm({...scheduleForm, phone: e.target.value})}
                      >
                        <option value="" className="text-slate-400">-- Choose Directory Partner --</option>
                        {allUsers.map(u => (
                          <option key={u.uid} value={u.phoneNum} className="text-white bg-[#121824]">
                            {u.name} ({u.phoneNum})
                          </option>
                        ))}
                      </select>
                      <select className="bg-black/40 border border-white/10 px-3 py-2 rounded-lg text-white text-xs outline-none" value={scheduleForm.type} onChange={e => setScheduleForm({...scheduleForm, type: e.target.value as 'audio'|'video'})}>
                        <option value="audio font-mono">Audio</option>
                        <option value="video font-mono">Video</option>
                      </select>
                    </div>
                    <div>
                      <input type="text" placeholder="Or type custom 8-digit online number..." className="w-full bg-black/40 border border-white/10 px-3 py-2 rounded-lg text-white text-xs outline-none focus:border-blue-400/50" value={scheduleForm.phone} onChange={e => setScheduleForm({...scheduleForm, phone: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input type="date" className="flex-1 bg-black/40 border border-white/10 px-3 py-2 rounded-lg text-white text-xs outline-none focus:border-blue-400/50 [color-scheme:dark]" value={scheduleForm.date} onChange={e => setScheduleForm({...scheduleForm, date: e.target.value})} />
                    <input type="time" className="flex-1 bg-black/40 border border-white/10 px-3 py-2 rounded-lg text-white text-xs outline-none focus:border-blue-400/50 [color-scheme:dark]" value={scheduleForm.time} onChange={e => setScheduleForm({...scheduleForm, time: e.target.value})} />
                    <button type="submit" className="bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer">
                      <Calendar className="w-3.5 h-3.5" />
                      Plan
                    </button>
                  </div>
                </form>

                <div className="flex-1 space-y-2.5 max-h-[180px] overflow-y-auto custom-scroll pr-1.5">
                  {scheduledCalls.length > 0 ? scheduledCalls.map(sc => (
                    <div key={sc.id} className="p-3 bg-white/5 rounded-[16px] border border-white/5 flex items-center justify-between">
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          {sc.type === 'video' ? <Video className="w-3.5 h-3.5 text-blue-400" /> : <Phone className="w-3.5 h-3.5 text-emerald-400" />}
                          <span className="text-xs font-bold text-white truncate">
                            {sc.callerUid === currentUser.uid ? sc.receiverName : sc.callerName}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(sc.scheduledTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {sc.callerUid !== currentUser.uid || sc.receiverPhone === myPhoneNum ? (
                           <button onClick={() => makeCall(sc.callerPhone, sc.type)} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-[10px] font-bold uppercase transition-all">Call Now</button>
                        ) : (
                           <button onClick={() => makeCall(sc.receiverPhone, sc.type)} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-[10px] font-bold uppercase transition-all">Call Now</button>
                        )}
                        <button onClick={() => deleteDoc(doc(db, 'hmeet_scheduled_calls', sc.id))} className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  )) : (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center text-gray-500">
                      <Clock className="w-8 h-8 opacity-50 mb-2" />
                      <p className="text-xs font-sans">No upcoming scheduled calls.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: MANUAL PHONE KEYPAD DIALER & PREVIOUS CALL HISTORY DIAGRAM */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* DIGITAL INTEGRATED KEYPAD */}
          <div className="liquid-glass p-6 md:p-8 flex flex-col gap-5 text-center">
            <h3 className="text-lg font-bold text-white text-left tracking-tight border-b border-white/5 pb-3 flex items-center gap-2">
              <Grid className="w-4 h-4 text-indigo-400" />
              Integrated Satellite Dialer
            </h3>
            
            {/* Screen readout */}
            <div className="relative">
              <div className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-3 text-center min-h-[52px] flex items-center justify-center font-mono text-2xl font-black text-blue-300 tracking-widest shadow-inner">
                {dialNumber ? (
                  <span>
                    {dialNumber.length > 4 ? `${dialNumber.slice(0, 4)} ${dialNumber.slice(4)}` : dialNumber}
                  </span>
                ) : (
                  <span className="text-[#9fb0d0]/30 font-sans text-sm font-normal uppercase tracking-widest">Dial 8 digits</span>
                )}
              </div>
              {dialNumber && (
                <button 
                  onClick={removeDialDigit} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-[#9fb0d0]/40 hover:text-white transition-colors"
                >
                  ⌫
                </button>
              )}
            </div>

            {dialError && (
              <p className="text-rose-400 text-xs font-bold text-left px-2">{dialError}</p>
            )}

            {/* Keys 4x3 Grid */}
            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(key => (
                <button 
                  key={key} 
                  onClick={() => appendDial(key)} 
                  className="py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 active:bg-blue-500/20 active:border-blue-500/30 transition-all font-sans font-extrabold text-white text-lg hover:scale-105 cursor-pointer shadow-sm select-none"
                >
                  {key}
                </button>
              ))}
            </div>

            {/* Dial Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mt-2 shrink-0">
              <button 
                onClick={() => makeCall(dialNumber, 'audio')}
                className="py-3.5 rounded-2xl bg-[#10b981]/20 hover:bg-[#10b981]/30 border border-[#10b981]/30 hover:border-[#10b981]/40 text-[#10b981] hover:text-white text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                disabled={isCallSettingUp}
              >
                <Phone className="w-4 h-4" /> Audio Dial
              </button>
              <button 
                onClick={() => makeCall(dialNumber, 'video')}
                className="py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all shadow-[0_8px_16px_rgba(37,99,235,0.25)] flex items-center justify-center gap-2 cursor-pointer"
                disabled={isCallSettingUp}
              >
                <Video className="w-4 h-4" /> Video Dial
              </button>
            </div>
          </div>

          {/* HISTORIC LOG RECENT CALLS */}
          <div className="liquid-glass p-6 text-left flex flex-col h-[280px]">
            <h3 className="text-lg font-bold text-white tracking-tight border-b border-white/5 pb-3 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Recent Call Log
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1.5 custom-scroll">
              {callHistory.length > 0 ? (
                callHistory.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between p-2 rounded-[16px] bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className={`p-2 rounded-lg ${entry.direction === 'outgoing' ? 'bg-blue-500/10 text-blue-400' : entry.direction === 'incoming' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {entry.type === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-xs font-bold text-white truncate font-sans">{entry.name}</h4>
                        <p className="text-[10px] text-[#9fb0d0]/50 font-mono">
                          {entry.number} • {entry.time}
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-slate-400">
                      {entry.direction}
                    </span>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-4 text-center text-slate-600">
                  <p className="text-xs font-sans">No call logs registered on this device.</p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      <div className="mt-8 shrink-0">
        <PrivacyFooter />
      </div>

    </div>
  );
}
