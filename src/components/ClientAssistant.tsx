import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getArtisanConfig, GetArtisanConfigOutputType } from 'zite-endpoints-sdk';
import { detectTrade } from 'zite-endpoints-sdk';
import { generateSummary } from 'zite-endpoints-sdk';
import { createProject } from 'zite-endpoints-sdk';
import { uploadFile } from 'zite-file-upload-sdk';
import AddressAutocomplete, { type AddressData } from '@/components/AddressAutocomplete';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, CheckCircle, Loader2, FileText, X, ImagePlus, Camera, Check } from 'lucide-react';
import { KadriaLogoImg } from '@/components/KadriaLogo';
import { toast } from 'sonner';

type ArtisanCfg = GetArtisanConfigOutputType;
type Msg = { role: 'user' | 'assistant'; content: string };
type FileInfo = { url: string; name: string };
type TradeQ = { question: string; suggestions: string[] };

type Step =
  | 'loading'
  | 'project_type' | 'description' | 'detecting'
  | 'trade_q' | 'trade_q_precision' | 'photos' | 'photos_upload'
  | 'budget' | 'budget_precision' | 'timeline' | 'timeline_precision'
  | 'name' | 'phone' | 'email' | 'address'
  | 'generating' | 'summary' | 'done';

const STEP_GROUPS = [
  { label: 'Votre projet', steps: ['project_type', 'description', 'detecting', 'trade_q', 'trade_q_precision'] },
  { label: 'Documents', steps: ['photos', 'photos_upload'] },
  { label: 'Budget & délai', steps: ['budget', 'budget_precision', 'timeline', 'timeline_precision'] },
  { label: 'Coordonnées', steps: ['name', 'phone', 'email', 'address', 'generating', 'summary'] },
] as const;

function getProgress(step: Step): { current: number; total: number; label: string } {
  let idx = 0;
  for (const g of STEP_GROUPS) {
    if ((g.steps as readonly string[]).includes(step)) return { current: idx + 1, total: STEP_GROUPS.length, label: g.label };
    idx++;
  }
  return { current: 1, total: STEP_GROUPS.length, label: '' };
}

function getProjectSuggestions(cfg: ArtisanCfg): string[] {
  const all = ((cfg.primaryTrade || '') + ' ' + (cfg.specialties || '')).toLowerCase();
  if (all.includes('paysag')) return ['Terrasse', 'Clôture / grillage', 'Allée / chemin', 'Plantation', 'Gazon / pelouse', 'Élagage', 'Autre'];
  if (all.includes('terrass')) return ['Terrassement', 'VRD / assainissement', 'Fondations', 'Nivellement', 'Décaissement piscine', 'Autre'];
  if (all.includes('électri')) return ['Tableau électrique', 'Mise aux normes', 'Éclairage', 'Prises', 'Borne de recharge', 'Autre'];
  if (all.includes('plomb')) return ['Salle de bain', 'Cuisine', 'Chauffe-eau', 'Fuite / réparation', 'Canalisation', 'Autre'];
  if (all.includes('menuise') || all.includes('charpent')) return ['Fenêtres / portes', 'Terrasse bois', 'Escalier', 'Placard', 'Bardage', 'Autre'];
  if (all.includes('maçon')) return ['Extension', 'Mur / clôture', 'Dalle / chape', 'Façade', 'Ouverture mur porteur', 'Autre'];
  if (all.includes('peint') || all.includes('décor')) return ['Peinture intérieure', 'Peinture extérieure', 'Papier peint', 'Enduit', 'Ravalement', 'Autre'];
  if (all.includes('couv') || all.includes('toit')) return ['Réfection toiture', 'Fuite / réparation', 'Zinguerie', 'Isolation combles', 'Velux', 'Autre'];
  if (all.includes('chauff') || all.includes('clim')) return ['Pompe à chaleur', 'Climatisation', 'Chaudière', 'Plancher chauffant', 'Radiateurs', 'Autre'];
  if (all.includes('carrel')) return ['Salle de bain', 'Cuisine', 'Sol intérieur', 'Terrasse', 'Escalier', 'Autre'];
  if (all.includes('isol')) return ['Combles', "Murs intérieur", "Murs extérieur", 'Plancher', 'Fenêtres', 'Autre'];
  if (all.includes('piscin')) return ['Construction piscine', 'Rénovation', 'Liner', 'Margelles', 'Local technique', 'Autre'];
  return ['Nouveau projet', "Travaux d'amélioration", 'Réparation', 'Entretien', 'Intervention urgente', 'Je ne sais pas encore'];
}

const BUDGETS = ['Moins de 1 000 €', '1 000 à 3 000 €', '3 000 à 5 000 €', '5 000 à 10 000 €', '10 000 à 20 000 €', 'Plus de 20 000 €', 'Je ne sais pas encore'];
const TIMELINES = ['Dès que possible', 'Sous 2 semaines', 'Sous 1 mois', 'Sous 3 mois', 'Pas de deadline précise'];

const VAGUE_PATTERNS = /^(je ne sais pas|pas encore|à voir|aucune idée|pas défini|je sais pas|aucun budget|pas de budget|on verra|à déterminer|à définir|pas encore défini|pas encore décidé)/i;

export default function ClientAssistant() {
  const [searchParams] = useSearchParams();
  const artisanId = useMemo(() => searchParams.get('artisan_id') || undefined, [searchParams]);
  const [cfg, setCfg] = useState<ArtisanCfg | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [step, setStep] = useState<Step>('loading');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const d = useRef({
    projectType: '', description: '', trade: '',
    tradeQs: [] as TradeQ[], tradeAs: [] as { question: string; answer: string }[], tqi: 0,
    budget: '', timeline: '', name: '', phone: '', email: '',
    address: null as AddressData | null,
    aiSummary: '', score: 0,
    pendingAutreQuestion: '', // Track which question "Autre" was selected for
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null!);
  const inputRef = useRef<HTMLInputElement>(null!);

  const scroll = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 60);
  }, []);

  useEffect(scroll, [msgs, suggestions, scroll]);

  const startQualificationRef = useRef(false);

  useEffect(() => {
    getArtisanConfig({ artisanId }).then(c => { setCfg(c); }).catch(() => {
      setCfg({ companyName: '', primaryTrade: '', specialties: '', serviceArea: '', phone: '', email: '', address: '', hours: '', logoUrl: '', welcomeName: '', welcomeMessage: '', companyDescription: '', aiInstructions: '', trades: '', websiteUrl: '', appointmentUrl: '' });
    });
  }, []);

  const add = (...m: Msg[]) => setMsgs(p => [...p, ...m]);
  const replaceLast = (content: string) => setMsgs(p => { const u = [...p]; u[u.length - 1] = { role: 'assistant', content }; return u; });

  useEffect(() => {
    if (!cfg || startQualificationRef.current) return;
    startQualificationRef.current = true;
    setSuggestions(getProjectSuggestions(cfg));
    const welcomeMsg = cfg.welcomeMessage
      ? cfg.welcomeMessage
      : cfg.companyName
        ? `👋 Bienvenue chez ${cfg.companyName} ! Quel projet souhaitez-vous réaliser ?\n\nDécrivez simplement votre besoin. Nous vous guiderons pour constituer un dossier complet.`
        : '👋 Bienvenue ! Quel projet souhaitez-vous réaliser ?\n\nDécrivez simplement votre besoin. Nous vous guiderons pour constituer un dossier complet.';
    setMsgs([{ role: 'assistant', content: welcomeMsg }]);
    setStep('project_type');
  }, [cfg]);

  const handle = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setInput('');

    switch (step) {
      case 'project_type': {
        // If "Autre" is selected, ask for precision
        if (t.toLowerCase() === 'autre') {
          add({ role: 'user', content: t }, { role: 'assistant', content: 'Pouvez-vous décrire votre besoin en quelques mots ? 😊' });
          setSuggestions([]); setStep('description');
          break;
        }
        d.current.projectType = t;
        add({ role: 'user', content: t }, { role: 'assistant', content: 'Pouvez-vous préciser votre projet en quelques mots ?' });
        setSuggestions([]); setStep('description'); break;
      }

      case 'description':
        d.current.description = t;
        if (!d.current.projectType) d.current.projectType = t;
        add({ role: 'user', content: t }, { role: 'assistant', content: 'Analyse de votre demande… ✨' });
        setSuggestions([]); setStep('detecting'); setBusy(true);
        try {
          const r = await detectTrade({ projectType: d.current.projectType, description: t, artisanTrade: cfg?.primaryTrade, artisanSpecialties: cfg?.specialties, aiInstructions: cfg?.aiInstructions });
          d.current.trade = r.trade; d.current.tradeQs = r.questions; d.current.tqi = 0;
          if (r.questions.length > 0) { replaceLast(r.questions[0].question); setSuggestions([...r.questions[0].suggestions, 'Autre']); setStep('trade_q'); }
          else goToPhotos();
        } catch { d.current.trade = cfg?.primaryTrade || 'Autre'; goToPhotos(); }
        setBusy(false); break;

      case 'trade_q': {
        const q = d.current.tradeQs[d.current.tqi];
        add({ role: 'user', content: t });
        setSuggestions([]);

        // If "Autre" is selected, ask for precision instead of moving on
        if (t.toLowerCase() === 'autre') {
          d.current.pendingAutreQuestion = q.question;
          add({ role: 'assistant', content: 'Pouvez-vous préciser votre réponse pour cette question ? Décrivez librement votre besoin.' });
          setStep('trade_q_precision');
          break;
        }

        d.current.tradeAs.push({ question: q.question, answer: t }); d.current.tqi++;
        if (d.current.tqi < d.current.tradeQs.length) {
          const nq = d.current.tradeQs[d.current.tqi];
          add({ role: 'assistant', content: nq.question }); setSuggestions([...nq.suggestions, 'Autre']);
        } else goToPhotos();
        break;
      }

      case 'trade_q_precision': {
        // Record the precision for the "Autre" answer
        d.current.tradeAs.push({ question: d.current.pendingAutreQuestion, answer: t });
        d.current.tqi++;
        d.current.pendingAutreQuestion = '';
        add({ role: 'user', content: t });

        if (d.current.tqi < d.current.tradeQs.length) {
          const nq = d.current.tradeQs[d.current.tqi];
          add({ role: 'assistant', content: '✅ Noté !\n\n' + nq.question }); setSuggestions([...nq.suggestions, 'Autre']);
          setStep('trade_q');
        } else {
          add({ role: 'assistant', content: '✅ Parfait, c\'est noté !' });
          goToPhotos();
        }
        break;
      }

      case 'photos':
        add({ role: 'user', content: t });
        if (t.toLowerCase().includes('oui') || t.toLowerCase().includes('photo') || t.toLowerCase().includes('ajouter')) {
          add({ role: 'assistant', content: '📸 Ajoutez vos fichiers ci-dessous, puis appuyez sur « Continuer ».' });
          setSuggestions([]); setStep('photos_upload');
        } else goToBudget();
        break;

      case 'photos_upload': goToBudget(); break;

      case 'budget': {
        // Check for vague response
        if (VAGUE_PATTERNS.test(t)) {
          add({ role: 'user', content: t }, { role: 'assistant', content: 'Même une fourchette approximative nous aiderait à mieux qualifier votre dossier 😊\n\nAvez-vous une idée de l\'ordre de grandeur ?' });
          setSuggestions(['Moins de 3 000 €', '3 000 à 10 000 €', '10 000 à 20 000 €', 'Plus de 20 000 €', 'Vraiment aucune idée']);
          setStep('budget_precision');
          break;
        }
        d.current.budget = t;
        add({ role: 'user', content: t }, { role: 'assistant', content: '⏰ Avez-vous une idée de la date souhaitée ?' });
        setSuggestions(TIMELINES); setStep('timeline'); break;
      }

      case 'budget_precision': {
        d.current.budget = t.toLowerCase().includes('aucune') ? 'À déterminer' : t;
        add({ role: 'user', content: t }, { role: 'assistant', content: '⏰ Avez-vous une idée de la date souhaitée ?' });
        setSuggestions(TIMELINES); setStep('timeline'); break;
      }

      case 'timeline': {
        // Check for vague response
        if (VAGUE_PATTERNS.test(t)) {
          add({ role: 'user', content: t }, { role: 'assistant', content: 'Même approximativement — plutôt dans les prochaines semaines ou les prochains mois ?' });
          setSuggestions(['Sous 1 mois', 'Dans 1 à 3 mois', 'Dans plus de 3 mois', 'Pas de contrainte']);
          setStep('timeline_precision');
          break;
        }
        d.current.timeline = t;
        add({ role: 'user', content: t }, { role: 'assistant', content: 'Pour finaliser votre dossier, nous avons besoin de vos coordonnées.\n\nQuel est votre nom complet ?' });
        setSuggestions([]); setStep('name'); break;
      }

      case 'timeline_precision': {
        d.current.timeline = t.toLowerCase().includes('contrainte') ? 'Pas de contrainte de délai' : t;
        add({ role: 'user', content: t }, { role: 'assistant', content: 'Pour finaliser votre dossier, nous avons besoin de vos coordonnées.\n\nQuel est votre nom complet ?' });
        setSuggestions([]); setStep('name'); break;
      }

      case 'name':
        d.current.name = t;
        add({ role: 'user', content: t }, { role: 'assistant', content: 'Votre numéro de téléphone ? 📱' });
        setStep('phone'); break;

      case 'phone': {
        const clean = t.replace(/[\s\-\.()]/g, '');
        if (clean.length < 8) { toast.error('Numéro trop court'); return; }
        d.current.phone = t;
        add({ role: 'user', content: t }, { role: 'assistant', content: 'Votre adresse email ?' });
        setStep('email'); break;
      }

      case 'email':
        if (!t.includes('@') || !t.includes('.')) { toast.error('Email invalide'); return; }
        d.current.email = t;
        add({ role: 'user', content: t }, { role: 'assistant', content: '📍 Adresse du chantier ?' });
        setSuggestions([]); setStep('address'); break;

      default: break;
    }
    inputRef.current?.focus();
  };

  const goToPhotos = () => {
    add({ role: 'assistant', content: '📸 Souhaitez-vous ajouter des photos ou documents ?' });
    setSuggestions(['Oui, ajouter des fichiers', 'Non, passer cette étape']); setStep('photos');
  };

  const goToBudget = () => {
    const prefix = files.length > 0 ? `${files.length} fichier(s) ajouté(s) ✅\n\n` : '';
    add({ role: 'assistant', content: `${prefix}💰 Quel budget envisagez-vous pour ce projet ?` });
    setSuggestions(BUDGETS); setStep('budget');
  };

  const onAddressSelect = async (addr: AddressData) => {
    d.current.address = addr;
    add({ role: 'user', content: addr.fullAddress }, { role: 'assistant', content: '📋 Préparation de votre dossier…' });
    setSuggestions([]); setStep('generating'); setBusy(true);
    try {
      const r = await generateSummary({ projectType: d.current.projectType, description: d.current.description, trade: d.current.trade, tradeAnswers: d.current.tradeAs, budget: d.current.budget, timeline: d.current.timeline, hasPhotos: files.length > 0 });
      d.current.aiSummary = r.aiSummary; d.current.score = r.completenessScore;
    } catch { d.current.aiSummary = d.current.description; d.current.score = 60; }
    setMsgs(p => p.slice(0, -1)); setBusy(false); setStep('summary');
  };

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files; if (!list) return;
    for (const f of Array.from(list)) {
      try { const { fileUrl } = await uploadFile({ data: f, filename: f.name }); setFiles(prev => [...prev, { url: fileUrl, name: f.name }]); toast.success(`${f.name} ajouté`); }
      catch { toast.error(`Erreur : ${f.name}`); }
    }
    e.target.value = '';
  };

  const onSubmit = async () => {
    const c = d.current; setSubmitting(true);
    try {
      const parts = c.name.split(' ');
      await createProject({ clientName: parts.slice(1).join(' ') || parts[0] || '', clientFirstName: parts[0] || '', clientPhone: c.phone, clientEmail: c.email, siteAddress: c.address?.fullAddress || '', city: c.address?.city, postalCode: c.address?.postalCode, latitude: c.address?.latitude, longitude: c.address?.longitude, trade: c.trade, budget: c.budget, desiredTimeline: c.timeline, aiSummary: c.aiSummary, chatHistory: JSON.stringify({ projectType: c.projectType, description: c.description, tradeAnswers: c.tradeAs }), completenessScore: c.score, attachments: files.map(f => f.url), artisanId });
      setStep('done');
    } catch { toast.error('Erreur lors de la soumission'); }
    setSubmitting(false);
  };

  const reset = () => {
    if (!cfg) return;
    setSuggestions(getProjectSuggestions(cfg)); setFiles([]); setInput('');
    const welcomeMsg = cfg.welcomeMessage
      ? cfg.welcomeMessage
      : cfg.companyName
        ? `👋 Bienvenue chez ${cfg.companyName} ! Quel projet souhaitez-vous réaliser ?\n\nDécrivez simplement votre besoin. Nous vous guiderons pour constituer un dossier complet.`
        : '👋 Bienvenue ! Quel projet souhaitez-vous réaliser ?\n\nDécrivez simplement votre besoin. Nous vous guiderons pour constituer un dossier complet.';
    setMsgs([{ role: 'assistant', content: welcomeMsg }]);
    setStep('project_type');
    d.current = { projectType: '', description: '', trade: '', tradeQs: [], tradeAs: [], tqi: 0, budget: '', timeline: '', name: '', phone: '', email: '', address: null, aiSummary: '', score: 0, pendingAutreQuestion: '' };
  };

  if (step === 'loading' || !cfg) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (step === 'done') return <DoneScreen cfg={cfg} c={d.current} files={files} onReset={reset} />;

  const progress = getProgress(step);

  return (
    <div className="h-[100dvh] flex flex-col bg-background">
      <header className="border-b border-border/50 bg-card px-4 py-3 flex items-center gap-3 shrink-0">
        <KadriaLogoImg />
        <span className="ml-auto text-xs text-muted-foreground hidden sm:block">Préparation du dossier</span>
      </header>

      <ProgressBar current={progress.current} total={progress.total} label={progress.label} />

      {step === 'summary' ? (
        <SummaryReview c={d.current} files={files} submitting={submitting} onSubmit={onSubmit} />
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-auto p-4">
            <div className="max-w-2xl mx-auto space-y-3 pb-2">
              {msgs.map((m, i) => <Bubble key={i} m={m} />)}

              {!busy && suggestions.length > 0 && (
                <div className="flex justify-start">
                  <div className="flex flex-wrap gap-2 max-w-[90%]">
                    {suggestions.map((s, i) => (
                      <button key={i} onClick={() => handle(s)} className="px-4 py-2.5 text-sm font-medium rounded-lg border border-border bg-card text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary active:scale-[0.97] transition-all duration-150">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 'photos_upload' && (
                <UploadZone files={files} fileRef={fileRef} onFiles={onFiles} onRemove={i => setFiles(f => f.filter((_, j) => j !== i))} onContinue={() => handle('_continue')} />
              )}
            </div>
          </div>

          <InputBar step={step} busy={busy} input={input} setInput={setInput} handle={handle} onAddressSelect={onAddressSelect} inputRef={inputRef} />
        </>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────

function ProgressBar({ current, total, label }: { current: number; total: number; label: string }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="bg-card border-b border-border/50 px-4 py-2 shrink-0">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span className="font-medium">{label}</span>
          <span>Étape {current} sur {total}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div className="bg-primary rounded-full h-1.5 transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function Bubble({ m }: { m: Msg }) {
  const u = m.role === 'user';
  return (
    <div className={`flex ${u ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${u ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>
        {m.content}
      </div>
    </div>
  );
}

function UploadZone({ files, fileRef, onFiles, onRemove, onContinue }: {
  files: FileInfo[]; fileRef: React.RefObject<HTMLInputElement | null>;
  onFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (i: number) => void; onContinue: () => void;
}) {
  return (
    <div className="flex justify-start">
      <div className="bg-muted/60 rounded-2xl rounded-bl-sm p-4 space-y-3 max-w-[85%] w-full">
        <input type="file" ref={fileRef as React.RefObject<HTMLInputElement>} className="hidden" multiple accept="image/*,.pdf" onChange={onFiles} />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="flex-1 justify-center gap-2"><ImagePlus className="w-4 h-4" /> Photos / documents</Button>
          <Button variant="outline" size="sm" onClick={() => { if (fileRef.current) { fileRef.current.accept = 'image/*'; fileRef.current.capture = 'environment'; fileRef.current.click(); fileRef.current.removeAttribute('capture'); fileRef.current.accept = 'image/*,.pdf'; } }} className="gap-2"><Camera className="w-4 h-4" /> Photo</Button>
        </div>
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-background px-2.5 py-1 rounded-md text-xs border">
                <FileText className="w-3 h-3 shrink-0" /><span className="truncate max-w-[100px]">{f.name}</span>
                <button onClick={() => onRemove(i)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        )}
        <Button size="sm" onClick={onContinue} className="w-full">Continuer →</Button>
      </div>
    </div>
  );
}

function InputBar({ step, busy, input, setInput, handle, onAddressSelect, inputRef }: {
  step: Step; busy: boolean; input: string;
  setInput: (v: string) => void; handle: (t: string) => void;
  onAddressSelect: (a: AddressData) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  if (step === 'photos_upload') return null;
  if (['detecting', 'generating'].includes(step)) {
    return (
      <div className="border-t border-border/50 bg-card p-4 shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /><span>Traitement en cours…</span>
        </div>
      </div>
    );
  }
  if (step === 'address') {
    return (
      <div className="border-t border-border/50 bg-card p-3 sm:p-4 shrink-0">
        <div className="max-w-2xl mx-auto"><AddressAutocomplete onSelect={onAddressSelect} /></div>
      </div>
    );
  }
  const ph: Record<string, string> = {
    project_type: 'Ou décrivez votre besoin…',
    description: 'Décrivez votre projet en détail…',
    trade_q_precision: 'Décrivez librement…',
    budget_precision: 'Votre estimation…',
    timeline_precision: 'Votre estimation…',
    name: 'Nom et prénom',
    phone: '06 12 34 56 78',
    email: 'votre@email.com',
  };
  return (
    <div className="border-t border-border/50 bg-card p-3 sm:p-4 shrink-0">
      <div className="max-w-2xl mx-auto flex gap-2">
        <Input ref={inputRef as React.RefObject<HTMLInputElement>} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handle(input)} placeholder={ph[step] || 'Votre réponse…'} disabled={busy} type={step === 'email' ? 'email' : step === 'phone' ? 'tel' : 'text'} autoFocus />
        <Button onClick={() => handle(input)} disabled={!input.trim() || busy} size="icon" className="shrink-0"><Send className="w-5 h-5" /></Button>
      </div>
    </div>
  );
}

function SummaryReview({ c, files, submitting, onSubmit }: {
  c: { projectType: string; description: string; trade: string; tradeAs: { question: string; answer: string }[]; budget: string; timeline: string; name: string; phone: string; email: string; address: AddressData | null; aiSummary: string; score: number };
  files: FileInfo[]; submitting: boolean; onSubmit: () => void;
}) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="bg-card border-b border-border/50 px-4 py-2 shrink-0">
        <div className="max-w-2xl mx-auto"><div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5"><span className="font-medium">Vérification</span><span>Dernière étape</span></div><div className="w-full bg-muted rounded-full h-1.5"><div className="bg-primary rounded-full h-1.5 w-full" /></div></div>
      </div>
      <div className="p-4">
        <div className="max-w-2xl mx-auto space-y-5 pb-8">
          <div><h2 className="text-xl font-bold">✨ Vérifiez votre dossier</h2><p className="text-sm text-muted-foreground mt-1">Vérifiez les informations avant de valider votre demande.</p></div>
          <Card className="p-5 space-y-3"><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Résumé du projet</h3><p className="text-sm leading-relaxed">{c.aiSummary}</p></Card>
          <Card className="p-5 space-y-3 text-sm"><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Détails du projet</h3><div className="grid gap-2"><SRow l="Nature" v={c.projectType} /><SRow l="Spécialité" v={c.trade} /><SRow l="Budget" v={c.budget} /><SRow l="Délai" v={c.timeline} />{c.tradeAs.map((qa, i) => <SRow key={i} l={qa.question} v={qa.answer} />)}</div></Card>
          <Card className="p-5 space-y-3 text-sm"><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coordonnées</h3><div className="grid gap-2"><SRow l="Nom" v={c.name} /><SRow l="Téléphone" v={c.phone} /><SRow l="Email" v={c.email} /><SRow l="Adresse" v={c.address?.fullAddress || ''} /></div></Card>
          {files.length > 0 && <Card className="p-5 space-y-3"><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pièces jointes ({files.length})</h3><div className="flex flex-wrap gap-2">{files.map((f, i) => <div key={i} className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-lg text-xs"><FileText className="w-3 h-3" />{f.name}</div>)}</div></Card>}
          <Button onClick={onSubmit} disabled={submitting} className="w-full" size="lg">{submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}Valider et envoyer ma demande</Button>
        </div>
      </div>
    </div>
  );
}

function SRow({ l, v }: { l: string; v: string }) {
  return <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">{l}</span><span className="font-medium text-right">{v || '—'}</span></div>;
}

function DoneScreen({ cfg, c, files, onReset }: { cfg: ArtisanCfg; c: { projectType: string; trade: string; budget: string; timeline: string; name: string }; files: FileInfo[]; onReset: () => void }) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/[0.04] rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">✨ Votre demande est prête</h1>
            <p className="text-muted-foreground leading-relaxed">
              Merci. Votre dossier contient désormais toutes les informations nécessaires à son étude.
              {cfg.companyName ? ` ${cfg.companyName} reviendra` : ' Notre équipe reviendra'} vers vous rapidement.
            </p>
          </div>
          <Card className="p-4 text-left space-y-2 text-sm">
            <SRow l="Projet" v={c.trade || c.projectType} />
            <SRow l="Budget" v={c.budget} />
            <SRow l="Délai" v={c.timeline} />
            {files.length > 0 && <SRow l="Documents" v={`${files.length} fichier(s)`} />}
          </Card>
          <Button variant="outline" onClick={onReset}>Soumettre un autre projet</Button>
        </div>
      </div>
    </div>
  );
}
