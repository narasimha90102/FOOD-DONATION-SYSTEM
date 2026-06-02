import Link from 'next/link';
import { ArrowLeft, Mail, Phone, MapPin } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto px-4 py-16 text-left">
      <Link href="/" className="inline-flex items-center gap-2 text-brand-500 hover:text-brand-600 transition-colors mb-8 font-semibold">
        <ArrowLeft className="h-4 w-4" /> Back to Home
      </Link>
      
      <h1 className="text-4xl font-extrabold text-white text-outfit mb-6">
        Contact FoodBridge<span className="text-brand-500">.AI</span>
      </h1>
      
      <p className="text-lg text-slate-300 mb-10 leading-relaxed">
        Have questions about onboarding, partnerships, or integration? Get in touch with our engineering and operations team. We are here to support your food rescue initiatives.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Contact Info */}
        <div className="flex flex-col gap-6">
          <div className="glass-panel p-6 border-white/5 flex gap-4 items-center">
            <Mail className="h-6 w-6 text-brand-500" />
            <div>
              <h3 className="font-semibold text-white">Email Us</h3>
              <p className="text-slate-400 text-sm">support@foodbridge.ai</p>
            </div>
          </div>
          <div className="glass-panel p-6 border-white/5 flex gap-4 items-center">
            <Phone className="h-6 w-6 text-emerald-400" />
            <div>
              <h3 className="font-semibold text-white">Call Support</h3>
              <p className="text-slate-400 text-sm">+1 (555) 019-2834</p>
            </div>
          </div>
          <div className="glass-panel p-6 border-white/5 flex gap-4 items-center">
            <MapPin className="h-6 w-6 text-teal-400" />
            <div>
              <h3 className="font-semibold text-white">Headquarters</h3>
              <p className="text-slate-400 text-sm">Silicon Valley, CA</p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <form className="glass-panel p-6 border-white/5 flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Name</label>
            <input type="text" placeholder="John Doe" className="w-full glass-input" required />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Email</label>
            <input type="email" placeholder="john@example.com" className="w-full glass-input" required />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Message</label>
            <textarea placeholder="Write your message here..." rows={4} className="w-full glass-input resize-none" required></textarea>
          </div>
          <button type="submit" className="w-full bg-brand-500 hover:bg-brand-600 text-dark-900 py-3 rounded-lg font-bold transition-all shadow-lg hover:shadow-brand-500/20 text-center">
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
}
