import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';
import { supabase } from './lib/supabase';
import { 
  Ticket, 
  Calendar, 
  MapPin, 
  CreditCard, 
  Plus, 
  LayoutDashboard, 
  QrCode, 
  LogOut, 
  User as UserIcon,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  ScanLine,
  LogIn,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { cn } from './lib/utils';
import { BrowserRouter, Routes, Route, useNavigate, Link } from 'react-router-dom';

// --- Types ---

interface User {
  id: string;
  email: string;
  photoURL?: string;
  displayName?: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  imageUrl: string;
  price: number;
  status: 'draft' | 'published' | 'cancelled';
}

interface TicketData {
  id: string;
  eventId: string;
  eventTitle: string;
  userName: string;
  phoneNumber: string;
  price: number;
  status: 'valid' | 'used' | 'refunded';
  mpesaReceipt: string;
  qrCode: string;
  createdAt: any;
}

// --- Components ---

const LoginModal = ({ onClose, onLogin }: any) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const payload = isLogin ? { email, password } : { email, password, name };
      
      const response = await axios.post(endpoint, payload);
      const { user, session } = response.data;
      
      if (session) {
        const { error: setSessionError } = await supabase.auth.setSession(session);
        if (setSessionError) throw setSessionError;
      }

      if (!isLogin && !session) {
        setError('Signup successful! Please check your email for verification.');
        setLoading(false);
        return;
      }

      onLogin(user);
      onClose();
    } catch (err: any) {
      console.error('Auth Error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Authentication failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#151F28] border border-[#F9943B]/30 rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative text-[#F9943B]"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-[#F9943B]/60 hover:text-[#F9943B]">
          <XCircle className="w-6 h-6" />
        </button>
        
        <h2 className="text-3xl font-black mb-2 font-artistic">Login to PassCard</h2>
        <p className="opacity-70 mb-6 uppercase tracking-widest text-xs">
          {isLogin ? 'Enter your credentials to access the backend' : 'Create an account to start your journey'}
        </p>
        
        {error && (
          <div className={cn(
            "p-4 rounded-xl mb-6 text-sm font-bold border",
            error.includes('successful') ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
          )}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div>
              <label className="block text-xs font-black mb-2 opacity-60 uppercase tracking-widest">Full Name</label>
              <input 
                required
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#151F28] px-5 py-4 rounded-xl border border-[#F9943B]/30 focus:border-[#F9943B] outline-none transition-all text-[#F9943B] font-bold"
                placeholder="Your Name"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-black mb-2 opacity-60 uppercase tracking-widest">Email Address</label>
            <input 
              required
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#151F28] px-5 py-4 rounded-xl border border-[#F9943B]/30 focus:border-[#F9943B] outline-none transition-all text-[#F9943B] font-bold"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-black mb-2 opacity-60 uppercase tracking-widest">Password</label>
            <div className="relative">
              <input 
                required
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#151F28] px-5 py-4 rounded-xl border border-[#F9943B]/30 focus:border-[#F9943B] outline-none transition-all text-[#F9943B] font-bold pr-14"
                placeholder="••••••••"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#F9943B]/60 hover:text-[#F9943B] transition-all"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          
          <button 
            disabled={loading}
            type="submit"
            className="w-full bg-[#F9943B] text-[#151F28] py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-all disabled:opacity-50 shadow-xl shadow-[#F9943B]/20"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <LogIn className="w-6 h-6" />}
            {isLogin ? 'LOGIN TO DASHBOARD' : 'CREATE ACCOUNT'}
          </button>

          <div className="text-center">
            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs font-black uppercase tracking-widest opacity-60 hover:opacity-100 hover:underline"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const Navbar = ({ user, isAdmin, onLogin, onLogout }: any) => (
  <nav className="bg-[#151F28] text-[#F9943B] py-6 px-8 sticky top-0 z-50 shadow-2xl border-b border-[#F9943B]/10">
    <div className="max-w-7xl mx-auto flex justify-between items-center">
      <Link 
        to="/"
        className="text-3xl font-black font-artistic cursor-pointer flex items-center gap-3"
      >
        <Ticket className="w-10 h-10" />
        PassCard
      </Link>
      
      <div className="flex items-center gap-8">
        <Link to="/" className="font-black uppercase tracking-widest text-sm hover:scale-110 transition-all opacity-80 hover:opacity-100">Events</Link>
        <Link to="/host" className="font-black uppercase tracking-widest text-sm hover:scale-110 transition-all opacity-80 hover:opacity-100">Host</Link>
        {user && <Link to="/my-tickets" className="font-black uppercase tracking-widest text-sm hover:scale-110 transition-all opacity-80 hover:opacity-100">Tickets</Link>}
        {isAdmin && (
          <Link 
            to="/admin" 
            className="bg-[#F9943B] text-[#151F28] px-6 py-2 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-[#F9943B]/20"
          >
            <LayoutDashboard className="w-4 h-4" />
            Admin
          </Link>
        )}
        
        {user ? (
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-xs font-black">{user.user_metadata?.full_name || user.email?.split('@')[0]}</span>
              {isAdmin && <span className="text-[9px] font-black bg-[#F9943B] text-[#151F28] px-1.5 py-0.5 rounded-md uppercase tracking-tighter">Admin</span>}
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-[#F9943B] shadow-lg overflow-hidden bg-[#F9943B]/10 flex items-center justify-center">
              {user.user_metadata?.avatar_url || user.photoURL ? (
                <img src={user.user_metadata?.avatar_url || user.photoURL} alt="User" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-6 h-6 text-[#F9943B]" />
              )}
            </div>
            <button onClick={onLogout} className="opacity-40 hover:opacity-100 transition-all">
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        ) : (
          <button 
            onClick={onLogin}
            className="bg-[#F9943B] text-[#151F28] px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-all shadow-lg shadow-[#F9943B]/20"
          >
            Login
          </button>
        )}
      </div>
    </div>
  </nav>
);

const EventCard = ({ event, onBuy }: any) => (
  <motion.div 
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-[#151F28] rounded-3xl overflow-hidden shadow-xl border border-[#F9943B]/20 group hover:shadow-[#F9943B]/10 transition-all duration-300"
  >
    <div className="relative h-48 overflow-hidden">
      <img 
        src={event.imageUrl || `https://picsum.photos/seed/${event.id}/800/600`} 
        alt={event.title}
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        referrerPolicy="no-referrer"
      />
      <div className="absolute top-4 right-4 bg-[#F9943B] text-[#151F28] px-4 py-1 rounded-full font-bold shadow-lg">
        KES {event.price}
      </div>
    </div>
    <div className="p-6">
      <h3 className="text-xl font-bold text-[#F9943B] mb-2">{event.title}</h3>
      <div className="space-y-2 mb-6">
        <div className="flex items-center text-[#F9943B]/70 text-sm gap-2">
          <Calendar className="w-4 h-4" />
          {format(new Date(event.date), 'PPP p')}
        </div>
        <div className="flex items-center text-[#F9943B]/70 text-sm gap-2">
          <MapPin className="w-4 h-4" />
          {event.location}
        </div>
      </div>
      <button 
        onClick={() => onBuy(event)}
        className="w-full bg-[#F9943B] text-[#151F28] py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all active:scale-95"
      >
        Buy Ticket
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  </motion.div>
);

const PurchaseModal = ({ event, onClose, onPurchase }: any) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onPurchase(event, { phoneNumber, name });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#151F28] border border-[#F9943B]/30 rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative text-[#F9943B]"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-[#F9943B]/60 hover:text-[#F9943B]">
          <XCircle className="w-6 h-6" />
        </button>
        
        <h2 className="text-3xl font-black mb-2 font-artistic">Complete Purchase</h2>
        <p className="opacity-70 mb-6">You're buying a ticket for <span className="font-bold">{event.title}</span></p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1 opacity-60 uppercase tracking-widest">Full Name</label>
            <input 
              required
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#151F28] px-4 py-3 rounded-xl border border-[#F9943B]/30 focus:border-[#F9943B] outline-none transition-all text-[#F9943B]"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1 opacity-60 uppercase tracking-widest">M-Pesa Number</label>
            <input 
              required
              type="tel" 
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full bg-[#151F28] px-4 py-3 rounded-xl border border-[#F9943B]/30 focus:border-[#F9943B] outline-none transition-all text-[#F9943B]"
              placeholder="254712345678"
            />
            <p className="text-xs opacity-40 mt-1">Format: 2547XXXXXXXX</p>
          </div>
          
          <div className="bg-[#F9943B]/10 p-6 rounded-2xl flex justify-between items-center border border-[#F9943B]/20">
            <span className="opacity-70 font-bold uppercase tracking-widest text-sm">Total Amount</span>
            <span className="text-2xl font-black">KES {event.price}</span>
          </div>
          
          <button 
            disabled={loading}
            type="submit"
            className="w-full bg-[#F9943B] text-[#151F28] py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <CreditCard className="w-6 h-6" />}
            PAY VIA M-PESA
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const TicketModal = ({ ticket, onClose }: any) => (
  <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
    <motion.div 
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-[#151F28] border border-[#F9943B]/30 rounded-[2.5rem] overflow-hidden max-w-sm w-full shadow-2xl text-[#F9943B]"
    >
      <div className="bg-[#151F28] p-8 text-center relative border-b border-[#F9943B]/10">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#F9943B]/50 hover:text-[#F9943B]">
          <XCircle className="w-6 h-6" />
        </button>
        <div className="bg-[#F9943B] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Ticket className="w-8 h-8 text-[#151F28]" />
        </div>
        <h2 className="text-2xl font-black font-artistic">{ticket.eventTitle}</h2>
        <p className="opacity-60 text-sm mt-1 uppercase tracking-widest">Valid Ticket</p>
      </div>
      
      <div className="p-8 space-y-6">
        <div className="flex justify-center bg-[#F9943B] p-6 rounded-3xl shadow-inner">
          <QRCodeSVG value={ticket.qrCode} size={200} bgColor="#F9943B" fgColor="#151F28" level="H" />
        </div>
        
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="opacity-50 uppercase tracking-tighter mb-1">Holder</p>
            <p className="font-black text-lg">{ticket.userName}</p>
          </div>
          <div className="text-right">
            <p className="opacity-50 uppercase tracking-tighter mb-1">Receipt</p>
            <p className="font-mono font-black text-lg">{ticket.mpesaReceipt}</p>
          </div>
          <div>
            <p className="opacity-50 uppercase tracking-tighter mb-1">Price</p>
            <p className="font-black text-lg">KES {ticket.price}</p>
          </div>
          <div className="text-right">
            <p className="opacity-50 uppercase tracking-tighter mb-1">Status</p>
            <p className={cn("font-black text-lg", ticket.status === 'valid' ? "text-[#F9943B]" : "opacity-40")}>
              {ticket.status.toUpperCase()}
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-[#F9943B]/5 p-6 text-center text-xs opacity-40 border-t border-[#F9943B]/10">
        Ticket ID: {ticket.id}
      </div>
    </motion.div>
  </div>
);

const SubmitRequestForm = ({ user }: { user: any }) => {
  const navigate = useNavigate();
  
  return (
    <section className="max-w-3xl mx-auto">
      <h2 className="text-5xl font-black mb-12 tracking-tight font-artistic">HOST AN <span className="text-[#151F28] bg-[#F9943B] px-4 rounded-2xl">EVENT</span></h2>
      <div className="bg-[#F9943B]/5 p-10 rounded-[3rem] border border-[#F9943B]/10 shadow-2xl">
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          await addDoc(collection(db, 'eventRequests'), {
            name: formData.get('name'),
            description: formData.get('description'),
            date: formData.get('date'),
            location: formData.get('location'),
            pricing: formData.get('pricing'),
            status: 'pending',
            submittedBy: user?.email,
            createdAt: serverTimestamp()
          });
          navigate('/');
        }} className="space-y-8">
          <div>
            <label className="block text-sm font-black uppercase tracking-widest opacity-60 mb-2">Event Name</label>
            <input name="name" required type="text" className="w-full bg-[#151F28] px-6 py-4 rounded-2xl border-2 border-[#F9943B]/20 outline-none focus:border-[#F9943B] text-xl transition-all" />
          </div>
          <div>
            <label className="block text-sm font-black uppercase tracking-widest opacity-60 mb-2">Description</label>
            <textarea name="description" required className="w-full bg-[#151F28] px-6 py-4 rounded-2xl border-2 border-[#F9943B]/20 outline-none focus:border-[#F9943B] text-xl h-40 transition-all" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-black uppercase tracking-widest opacity-60 mb-2">Date & Time</label>
              <input name="date" required type="datetime-local" className="w-full bg-[#151F28] px-6 py-4 rounded-2xl border-2 border-[#F9943B]/20 outline-none focus:border-[#F9943B] text-xl transition-all" />
            </div>
            <div>
              <label className="block text-sm font-black uppercase tracking-widest opacity-60 mb-2">Location</label>
              <input name="location" required type="text" className="w-full bg-[#151F28] px-6 py-4 rounded-2xl border-2 border-[#F9943B]/20 outline-none focus:border-[#F9943B] text-xl transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-black uppercase tracking-widest opacity-60 mb-2">Pricing Tiers</label>
            <input name="pricing" required type="text" placeholder="e.g. Regular: 1000, VIP: 3000" className="w-full bg-[#151F28] px-6 py-4 rounded-2xl border-2 border-[#F9943B]/20 outline-none focus:border-[#F9943B] text-xl transition-all" />
          </div>
          <button type="submit" className="w-full bg-[#F9943B] text-[#151F28] py-6 rounded-2xl font-black text-2xl hover:scale-[1.02] transition-all shadow-xl shadow-[#F9943B]/20">
            SUBMIT REQUEST
          </button>
        </form>
      </div>
    </section>
  );
};

const ScannerModal = ({ onScan, onClose }: { onScan: (data: string) => void, onClose: () => void }) => {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );
    scanner.render(onScan, (err) => {
      // console.warn(err);
    });
    return () => {
      scanner.clear().catch(error => console.error("Failed to clear scanner", error));
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[150] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#151F28] border border-[#F9943B]/30 rounded-[3rem] p-8 max-w-md w-full shadow-2xl relative text-[#F9943B]"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-[#F9943B]/60 hover:text-[#F9943B]">
          <XCircle className="w-6 h-6" />
        </button>
        <h2 className="text-3xl font-black mb-8 font-artistic text-center">SCAN TICKET</h2>
        <div id="reader" className="overflow-hidden rounded-2xl border-2 border-[#F9943B]/20"></div>
        <p className="text-center mt-6 opacity-60 font-bold uppercase tracking-widest text-sm">Position QR code within the frame</p>
      </motion.div>
    </div>
  );
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('events');
  const [events, setEvents] = useState<Event[]>([]);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'));
    return onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event)));
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketData)));
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'eventRequests'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const updateRequestStatus = async (id: string, status: string, reqData: any) => {
    await updateDoc(doc(db, 'eventRequests', id), { status });
    if (status === 'approved') {
      await addDoc(collection(db, 'events'), {
        title: reqData.name,
        description: reqData.description,
        date: reqData.date,
        location: reqData.location,
        price: Number(reqData.pricing.split(':')[1]?.trim() || 0),
        imageUrl: 'https://picsum.photos/seed/event/1920/1080',
        status: 'published',
        createdAt: serverTimestamp()
      });
    }
  };

  const handleScan = async (decodedText: string) => {
    setShowScanner(false);
    setScanResult("Verifying ticket...");
    try {
      const q = query(collection(db, 'tickets'), where('qrCode', '==', decodedText));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setScanResult("❌ INVALID TICKET");
      } else {
        const ticket = snapshot.docs[0];
        const ticketData = ticket.data();
        if (ticketData.status === 'used') {
          setScanResult("⚠️ TICKET ALREADY USED");
        } else {
          await updateDoc(doc(db, 'tickets', ticket.id), { status: 'used' });
          setScanResult(`✅ VALID: ${ticketData.eventTitle} for ${ticketData.userName}`);
        }
      }
    } catch (error) {
      setScanResult("❌ SCAN ERROR");
    }
  };

  return (
    <div className="bg-[#151F28] rounded-[3rem] shadow-2xl overflow-hidden border border-[#F9943B]/20">
      <div className="flex border-b border-[#F9943B]/10 overflow-x-auto scrollbar-hide">
        {['events', 'tickets', 'requests', 'scanner'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-8 py-6 font-black uppercase tracking-widest transition-all whitespace-nowrap", 
              activeTab === tab ? "text-[#F9943B] border-b-4 border-[#F9943B]" : "text-[#F9943B]/40 hover:text-[#F9943B]/60"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-8">
        {activeTab === 'events' && (
          <div className="grid grid-cols-1 gap-6">
            {events.map(event => (
              <div key={event.id} className="flex items-center justify-between p-6 bg-[#F9943B]/5 rounded-3xl border border-[#F9943B]/10">
                <div>
                  <h4 className="font-black text-xl">{event.title}</h4>
                  <p className="opacity-60">{event.location} • {event.date}</p>
                </div>
                <span className="px-4 py-1 rounded-full text-xs font-black bg-[#F9943B] text-[#151F28] uppercase">
                  {event.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="space-y-4">
            {tickets.map(ticket => (
              <div key={ticket.id} className="p-6 bg-[#F9943B]/5 rounded-3xl border border-[#F9943B]/10 flex justify-between items-center">
                <div>
                  <h4 className="font-black">{ticket.eventTitle}</h4>
                  <p className="text-sm opacity-60">{ticket.userName} • {ticket.mpesaReceipt}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                    ticket.status === 'valid' ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                  )}>
                    {ticket.status}
                  </span>
                  <span className="font-black">KES {ticket.price}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-6">
            {requests.map(req => (
              <div key={req.id} className="p-8 bg-[#F9943B]/5 rounded-[2.5rem] border border-[#F9943B]/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h4 className="font-black text-2xl mb-1">{req.name}</h4>
                  <p className="opacity-60 text-lg">{req.location} • {req.date}</p>
                  <p className="opacity-40 text-sm mt-2 font-bold uppercase tracking-widest">By: {req.submittedBy}</p>
                </div>
                <div className="flex items-center gap-6">
                  <span className={cn(
                    "px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest",
                    req.status === 'pending' ? "bg-[#F9943B]/40 text-[#151F28]" : 
                    req.status === 'approved' ? "bg-[#F9943B] text-[#151F28]" : "bg-[#F9943B]/10 text-[#F9943B] opacity-40"
                  )}>
                    {req.status?.toUpperCase()}
                  </span>
                  {req.status === 'pending' && (
                    <div className="flex gap-4">
                      <button onClick={() => updateRequestStatus(req.id, 'approved', req)} className="text-[#F9943B] font-black uppercase tracking-widest hover:underline">Approve</button>
                      <button onClick={() => updateRequestStatus(req.id, 'rejected', req)} className="text-[#F9943B] opacity-60 font-black uppercase tracking-widest hover:underline">Reject</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'scanner' && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-[#F9943B] w-32 h-32 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-[#F9943B]/20">
              <ScanLine className="w-16 h-16 text-[#151F28]" />
            </div>
            <h3 className="text-4xl font-black mb-4 font-artistic">TICKET SCANNER</h3>
            <p className="opacity-60 max-w-md mb-12 text-lg">Use your camera to verify attendee tickets in real-time. Scanned tickets will be marked as used.</p>
            
            <button 
              onClick={() => setShowScanner(true)}
              className="bg-[#F9943B] text-[#151F28] px-12 py-5 rounded-2xl font-black text-xl hover:scale-105 transition-all shadow-xl shadow-[#F9943B]/20 flex items-center gap-3"
            >
              <QrCode className="w-6 h-6" />
              OPEN SCANNER
            </button>

            {scanResult && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "mt-12 p-6 rounded-3xl border-2 font-black text-xl",
                  scanResult.includes('✅') ? "bg-green-500/10 border-green-500/30 text-green-500" : 
                  scanResult.includes('⚠️') ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500" :
                  "bg-red-500/10 border-red-500/30 text-red-500"
                )}
              >
                {scanResult}
              </motion.div>
            )}
          </div>
        )}
      </div>

      {showScanner && <ScannerModal onScan={handleScan} onClose={() => setShowScanner(false)} />}
    </div>
  );
};


// --- Main App ---

function AppContent() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [myTickets, setMyTickets] = useState<TicketData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [activeTicket, setActiveTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'waiting' | 'success' | 'failed'>('idle');
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUser = async (u: any) => {
    if (!u) {
      setUser(null);
      setIsAdmin(false);
      return;
    }
    setUser(u);
    const isDesignatedAdmin = u.email === 'inspiresolutions254@gmail.com';
    setIsAdmin(isDesignatedAdmin);
  };

  useEffect(() => {
    const q = query(collection(db, 'events'), where('status', '==', 'published'), orderBy('date', 'asc'));
    return onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event)));
    });
  }, []);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'tickets'), where('phoneNumber', '!=', ''), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        setMyTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketData)));
      });
    }
  }, [user]);

  const handlePurchase = async (event: Event, details: { phoneNumber: string, name: string }) => {
    setPaymentStatus('waiting');
    try {
      const response = await axios.post('/api/mpesa/stkpush', {
        phoneNumber: details.phoneNumber,
        amount: event.price,
        eventId: event.id
      });

      const checkoutRequestId = response.data.CheckoutRequestID;

      const txRef = await addDoc(collection(db, 'transactions'), {
        eventId: event.id,
        eventTitle: event.title,
        userName: details.name,
        phoneNumber: details.phoneNumber,
        amount: event.price,
        checkoutRequestId,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Simulation for demo
      setTimeout(async () => {
        const mpesaReceipt = "MP" + Math.random().toString(36).substring(7).toUpperCase();
        await updateDoc(doc(db, 'transactions', txRef.id), { status: 'success', mpesaReceipt });

        const ticketRef = await addDoc(collection(db, 'tickets'), {
          eventId: event.id,
          eventTitle: event.title,
          userName: details.name,
          phoneNumber: details.phoneNumber,
          price: event.price,
          status: 'valid',
          mpesaReceipt,
          qrCode: `TICKET-${txRef.id}-${mpesaReceipt}`,
          createdAt: serverTimestamp()
        });

        if (user?.email) {
          await axios.post('/api/send-ticket', {
            email: user.email,
            ticketData: {
              id: ticketRef.id,
              eventTitle: event.title,
              userName: details.name,
              mpesaReceipt,
              price: event.price
            }
          });
        }

        setPaymentStatus('success');
        setSelectedEvent(null);
        const ticketSnap = await getDocs(query(collection(db, 'tickets'), where('mpesaReceipt', '==', mpesaReceipt)));
        if (!ticketSnap.empty) {
          setActiveTicket({ id: ticketSnap.docs[0].id, ...ticketSnap.docs[0].data() } as TicketData);
        }
      }, 5000);

    } catch (error) {
      console.error("Purchase failed:", error);
      setPaymentStatus('failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#151F28] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#F9943B] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#151F28] font-sans text-[#F9943B]">
      <Navbar 
        user={user} 
        isAdmin={isAdmin} 
        onLogin={() => setShowLoginModal(true)} 
        onLogout={() => supabase.auth.signOut()} 
      />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <Routes>
          <Route path="/" element={
            <section>
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-20 gap-8">
                <div className="max-w-2xl">
                  <h1 className="text-6xl md:text-8xl font-black mb-6 leading-none font-artistic tracking-tighter">
                    ACCESS THE <br />
                    <span className="bg-[#F9943B] text-[#151F28] px-4 rounded-2xl">XTRAORDINARY</span>
                  </h1>
                  <p className="opacity-70 text-xl md:text-2xl font-medium mb-10">The premier Christian events ticketing platform in Kenya.</p>
                  
                  <div className="flex flex-col sm:flex-row gap-6">
                    <button 
                      onClick={() => document.getElementById('events-grid')?.scrollIntoView({ behavior: 'smooth' })}
                      className="bg-[#F9943B] text-[#151F28] px-12 py-5 rounded-2xl font-black text-xl hover:scale-105 transition-all shadow-2xl shadow-[#F9943B]/20"
                    >
                      EXPLORE EVENTS
                    </button>
                    {!user && (
                      <button 
                        onClick={() => setShowLoginModal(true)}
                        className="bg-[#151F28] border-2 border-[#F9943B] text-[#F9943B] px-12 py-5 rounded-2xl font-black text-xl hover:bg-[#F9943B] hover:text-[#151F28] transition-all flex items-center justify-center gap-3"
                      >
                        <LogIn className="w-6 h-6" />
                        LOGIN TO DASHBOARD
                      </button>
                    )}
                  </div>
                </div>
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#F9943B]/50 w-6 h-6" />
                  <input 
                    type="text" 
                    placeholder="Search events..." 
                    className="pl-14 pr-6 py-5 rounded-2xl bg-[#151F28] border-2 border-[#F9943B]/20 text-[#F9943B] placeholder:text-[#F9943B]/30 focus:border-[#F9943B] outline-none w-full text-lg transition-all"
                  />
                </div>
              </div>

              <div id="events-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                {events.map(event => (
                  <EventCard key={event.id} event={event} onBuy={setSelectedEvent} />
                ))}
              </div>
            </section>
          } />
          
          <Route path="/host" element={<SubmitRequestForm user={user} />} />
          
          <Route path="/my-tickets" element={
            <section>
              <h2 className="text-5xl font-black mb-12 tracking-tight font-artistic">MY <span className="text-[#151F28] bg-[#F9943B] px-4 rounded-2xl">TICKETS</span></h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {myTickets.map(ticket => (
                  <motion.div 
                    key={ticket.id}
                    whileHover={{ scale: 1.02, y: -5 }}
                    onClick={() => setActiveTicket(ticket)}
                    className="bg-[#F9943B]/5 p-8 rounded-[2.5rem] border border-[#F9943B]/10 flex items-center gap-8 cursor-pointer group hover:bg-[#F9943B]/10 transition-all"
                  >
                    <div className="bg-[#F9943B] w-20 h-20 rounded-3xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-lg">
                      <QrCode className="w-10 h-10 text-[#151F28]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-2xl mb-1">{ticket.eventTitle}</h3>
                      <p className="opacity-50 font-mono text-sm uppercase tracking-widest">{ticket.mpesaReceipt}</p>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest",
                        ticket.status === 'valid' ? "bg-[#F9943B] text-[#151F28]" : "bg-red-500 text-white"
                      )}>
                        {ticket.status.toUpperCase()}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          } />

          {isAdmin && <Route path="/admin" element={<AdminDashboard />} />}
        </Routes>
      </main>

      <AnimatePresence>
        {showLoginModal && (
          <LoginModal 
            onClose={() => setShowLoginModal(false)} 
            onLogin={(u: any) => handleUser(u)} 
          />
        )}

        {selectedEvent && (
          <PurchaseModal 
            event={selectedEvent} 
            onClose={() => setSelectedEvent(null)} 
            onPurchase={handlePurchase} 
          />
        )}
        
        {paymentStatus === 'waiting' && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#151F28] border border-[#F9943B]/30 rounded-[3rem] p-12 max-w-sm w-full text-center shadow-2xl text-[#F9943B]"
            >
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 border-4 border-[#F9943B]/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-[#F9943B] rounded-full border-t-transparent animate-spin"></div>
                <CreditCard className="absolute inset-0 m-auto w-10 h-10 text-[#F9943B]" />
              </div>
              <h2 className="text-3xl font-black mb-4 font-artistic">PROCESSING</h2>
              <p className="opacity-60 text-lg leading-relaxed">Please check your phone for the M-Pesa STK Push prompt and enter your PIN.</p>
            </motion.div>
          </div>
        )}

        {activeTicket && (
          <TicketModal ticket={activeTicket} onClose={() => setActiveTicket(null)} />
        )}
      </AnimatePresence>

      <footer className="bg-[#151F28] text-[#F9943B] py-20 mt-20 border-t border-[#F9943B]/10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-16">
          <div>
            <div className="text-3xl font-black flex items-center gap-3 mb-6 font-artistic">
              <Ticket className="w-10 h-10" />
              PassCard
            </div>
            <p className="opacity-70 text-lg leading-relaxed">Purely a Christian events ticketing platform.</p>
          </div>
          <div>
            <h4 className="font-black text-xl mb-6 uppercase tracking-widest">Quick Links</h4>
            <ul className="space-y-4 text-lg">
              <li><Link to="/" className="hover:translate-x-2 transition-transform block">Browse Events</Link></li>
              <li><Link to="/host" className="hover:translate-x-2 transition-transform block">Host Event</Link></li>
              <li><Link to="/my-tickets" className="hover:translate-x-2 transition-transform block">My Tickets</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black text-xl mb-6 uppercase tracking-widest">Contact</h4>
            <p className="text-lg mb-2">inspiresolutions254@gmail.com</p>
            <a href="tel:0791624455" className="text-2xl font-black block hover:scale-105 transition-transform origin-left">0791 624 455</a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pt-12 mt-12 border-t border-[#F9943B]/10 text-center opacity-40 text-sm">
          &copy; 2026 PassCard Ticketing. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
