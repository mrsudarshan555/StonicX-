import React, { useState } from 'react';
import { MemoryItem, FamilyContact } from '../../types';
import { INITIAL_FAMILY_CONTACTS } from '../../data/defaultData';
import { 
  Brain, Plus, Search, Pin, Trash2, 
  Tag, Clock, Check, Download, Sparkles, Filter,
  Users, Phone, MessageSquare, Send, Heart, Edit3, X
} from 'lucide-react';

interface MemoriesScreenProps {
  memories: MemoryItem[];
  onAddMemory: (newMem: Omit<MemoryItem, 'id' | 'timestamp'>) => void;
  onDeleteMemory: (id: string) => void;
  onTogglePin: (id: string) => void;
  onTriggerDirectMessage?: (contactName: string, service: 'whatsapp' | 'call') => void;
  triggerAddSignal?: number;
}

export const MemoriesScreen: React.FC<MemoriesScreenProps> = ({
  memories,
  onAddMemory,
  onDeleteMemory,
  onTogglePin,
  onTriggerDirectMessage,
  triggerAddSignal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [familyContacts, setFamilyContacts] = useState<FamilyContact[]>(INITIAL_FAMILY_CONTACTS);
  const [showAddFamilyModal, setShowAddFamilyModal] = useState(false);
  const [newFamilyRelation, setNewFamilyRelation] = useState<FamilyContact['relationship']>('Father');
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newFamilyNumber, setNewFamilyNumber] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Open action menu on FAB signal
  React.useEffect(() => {
    if (triggerAddSignal && triggerAddSignal > 0) {
      setShowActionMenu(true);
    }
  }, [triggerAddSignal]);

  // New memory form state
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryItem['category']>('personal');

  const categories = ['all', 'personal', 'preference', 'system', 'task'];

  const filteredMemories = memories.filter((m) => {
    const matchesCat = selectedCategory === 'all' || m.category === selectedCategory;
    const matchesSearch =
      m.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.value.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleSaveMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;

    onAddMemory({
      key: newKey.trim(),
      value: newValue.trim(),
      category: newCategory,
      isPinned: false
    });

    setNewKey('');
    setNewValue('');
    setShowAddModal(false);
  };

  const handleAddFamilyContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamilyName.trim() || !newFamilyNumber.trim()) return;

    const newContact: FamilyContact = {
      id: `fam-${Date.now()}`,
      relationship: newFamilyRelation,
      name: newFamilyName.trim(),
      whatsappNumber: newFamilyNumber.trim(),
      notes: `Family Contact • ${newFamilyRelation}`
    };

    setFamilyContacts(prev => [...prev, newContact]);
    setNewFamilyName('');
    setNewFamilyNumber('');
    setShowAddFamilyModal(false);
  };

  const handleTriggerContact = (contact: FamilyContact, type: 'whatsapp' | 'call') => {
    const cleanNum = contact.whatsappNumber.replace(/[^0-9+]/g, '');
    if (type === 'whatsapp') {
      setActionNotice(`Opening WhatsApp chat with ${contact.name}...`);
      if (typeof window !== 'undefined') {
        const url = `https://wa.me/${cleanNum.replace('+', '')}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } else {
      setActionNotice(`Dialing ${contact.name} (${contact.whatsappNumber})...`);
    }

    if (onTriggerDirectMessage) {
      onTriggerDirectMessage(contact.name, type);
    }

    setTimeout(() => setActionNotice(null), 3000);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#070913] text-slate-200">
      
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#070913]/95 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-500/20 text-purple-400 rounded-lg">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Context & Memories</h2>
            <p className="text-[10px] text-slate-400 font-sans">Persistent Knowledge Base & Family Contacts</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 bg-purple-500/15 border border-purple-500/30 rounded-full text-[10px] font-mono text-purple-300">
            {memories.length} facts • {familyContacts.length} contacts
          </span>
        </div>
      </div>

      {/* Action Notice Toast */}
      {actionNotice && (
        <div className="p-2 mx-4 mt-2 bg-cyan-950/80 border border-cyan-400/40 rounded-xl text-[11px] font-mono text-cyan-300 flex items-center gap-2 animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Memory List Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">

        {/* 1. FAMILY CONTACTS CARD SECTION */}
        <div className="p-3.5 bg-[#0C1024] border border-white/10 rounded-2xl space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-semibold text-white tracking-wide">
                Family & Priority Contacts
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Quick Call & Message</span>
          </div>

          {familyContacts.length === 0 ? (
            <div className="p-4 text-center border border-dashed border-white/10 rounded-xl bg-[#080B1E]/60 space-y-1.5">
              <p className="text-xs text-slate-400 font-sans">No family contacts added yet.</p>
              <button
                onClick={() => setShowAddFamilyModal(true)}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium cursor-pointer"
              >
                Tap + Family to add.
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {familyContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-3 bg-[#0E1329] border border-white/10 hover:border-cyan-500/40 rounded-xl flex items-center justify-between transition-all shadow-sm"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white">{contact.name}</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[9px] font-medium">
                        {contact.relationship}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{contact.whatsappNumber}</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleTriggerContact(contact, 'whatsapp')}
                      className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 rounded-xl text-emerald-300 transition-colors"
                      title={`Send WhatsApp message to ${contact.name}`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleTriggerContact(contact, 'call')}
                      className="p-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 rounded-xl text-cyan-300 transition-colors"
                      title={`Voice call ${contact.name}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. SEARCH & CONTEXT MEMORIES */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white tracking-wide">
              Learned Facts ({filteredMemories.length})
            </h3>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search facts & preferences..."
                className="w-full bg-[#0C1024] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-purple-400 transition-colors"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-[10px] uppercase font-medium tracking-wider shrink-0 transition-all ${
                    selectedCategory === cat
                      ? 'bg-purple-600 text-white font-semibold shadow-sm'
                      : 'bg-[#0C1024] text-slate-400 hover:text-slate-200 border border-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredMemories.length === 0 ? (
              <div className="p-6 text-center border border-white/5 rounded-2xl bg-[#0C1024]/50">
                <p className="text-xs text-slate-400 font-sans">No matching facts found.</p>
              </div>
            ) : (
              filteredMemories.map((mem) => (
                <div
                  key={mem.id}
                  className={`p-3.5 bg-[#0C1024] border rounded-2xl transition-all space-y-1.5 shadow-sm ${
                    mem.isPinned ? 'border-purple-500/40 bg-purple-950/15' : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{mem.key}</span>
                      {mem.isPinned && (
                        <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[9px] font-medium flex items-center gap-0.5">
                          <Pin className="w-2.5 h-2.5" /> Pinned
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onTogglePin(mem.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          mem.isPinned ? 'text-purple-400 hover:text-purple-300' : 'text-slate-400 hover:text-white'
                        }`}
                        title={mem.isPinned ? 'Unpin fact' : 'Pin fact to priority context'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteMemory(mem.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                        title="Delete memory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    {mem.value}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Family Contact Modal */}
      {showAddFamilyModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddFamilyContact}
            className="w-full max-w-sm bg-[#0C1021] border border-cyan-500/40 rounded-3xl p-4 space-y-3 shadow-2xl animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-400" /> Add Family Contact
              </span>
              <button
                type="button"
                onClick={() => setShowAddFamilyModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Relationship</label>
              <select
                value={newFamilyRelation}
                onChange={(e) => setNewFamilyRelation(e.target.value as any)}
                className="w-full bg-[#070913] border border-white/10 rounded-xl p-2 text-xs text-white font-mono outline-none focus:border-cyan-500"
              >
                <option value="Father">Father (Dad)</option>
                <option value="Mother">Mother (Mom)</option>
                <option value="Sibling">Sibling (Brother / Sister)</option>
                <option value="Spouse">Spouse / Partner</option>
                <option value="Other">Other Family</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Contact Name</label>
              <input
                type="text"
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
                placeholder="e.g. Dad or Mom"
                className="w-full bg-[#070913] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 font-sans"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">WhatsApp / Phone Number</label>
              <input
                type="text"
                value={newFamilyNumber}
                onChange={(e) => setNewFamilyNumber(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full bg-[#070913] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={!newFamilyName.trim() || !newFamilyNumber.trim()}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-colors"
            >
              Save Family Contact
            </button>
          </form>
        </div>
      )}

      {/* Add Memory Modal */}
      {showAddModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveMemory}
            className="w-full max-w-sm bg-[#0C1021] border border-purple-500/40 rounded-3xl p-4 space-y-3 shadow-2xl animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-mono font-bold text-purple-400 uppercase flex items-center gap-1.5">
                <Brain className="w-4 h-4" /> Store New Memory Fact
              </span>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Key / Topic</label>
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="e.g. Favorite Coffee or Project Deadline"
                className="w-full bg-[#070913] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500 font-sans"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full bg-[#070913] border border-white/10 rounded-xl p-2 text-xs text-white font-mono outline-none focus:border-purple-500"
              >
                <option value="personal">Personal</option>
                <option value="preference">Preference</option>
                <option value="system">System</option>
                <option value="task">Task</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Detail / Memory Value</label>
              <textarea
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Write exact preference detail..."
                rows={3}
                className="w-full bg-[#070913] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-purple-500 font-sans resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={!newKey.trim() || !newValue.trim()}
              className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-colors"
            >
              Save to Context Memory
            </button>
          </form>
        </div>
      )}

      {/* Floating Action Menu Popup (Triggered by center + FAB) */}
      {showActionMenu && (
        <div 
          className="absolute inset-0 bg-black/80 backdrop-blur-md z-40 flex items-end sm:items-center justify-center p-3 animate-in fade-in"
          onClick={() => setShowActionMenu(false)}
        >
          <div 
            className="w-full max-w-sm bg-[#0B0F22] border border-white/15 rounded-3xl p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Add New Context</h3>
                  <p className="text-[11px] text-slate-400">Select an item to record in MAYRA's memory</p>
                </div>
              </div>
              <button
                onClick={() => setShowActionMenu(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-white/[0.05]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  setShowActionMenu(false);
                  setShowAddModal(true);
                }}
                className="w-full p-3.5 bg-white/[0.04] hover:bg-purple-600/20 border border-white/10 hover:border-purple-500/50 rounded-2xl flex items-center gap-3.5 transition-all text-left group active:scale-98"
              >
                <div className="p-2.5 bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white rounded-xl transition-colors">
                  <Brain className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-white block">+ Add Fact / Memory</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Store preferences, routines, notes or personal details</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowActionMenu(false);
                  setShowAddFamilyModal(true);
                }}
                className="w-full p-3.5 bg-white/[0.04] hover:bg-cyan-600/20 border border-white/10 hover:border-cyan-500/50 rounded-2xl flex items-center gap-3.5 transition-all text-left group active:scale-98"
              >
                <div className="p-2.5 bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white rounded-xl transition-colors">
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-white block">+ Add Family Contact</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Register Dad, Mom, or family with phone / WhatsApp</span>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowActionMenu(false)}
              className="w-full py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 rounded-xl text-xs font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

