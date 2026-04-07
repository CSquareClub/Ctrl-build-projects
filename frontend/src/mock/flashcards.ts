export type FlashcardMock = {
  id: string
  deck: string
  front: string
  back: string
  mastery: number
  streak: number
  aura: {
    from: string
    to: string
  }
}

export const flashcardMocks: FlashcardMock[] = [
  {
    id: 'neuro-01',
    deck: 'Neuro Sprint',
    front: 'Which neurotransmitter is most linked with reward prediction?',
    back: 'Dopamine drives reward prediction error signaling.',
    mastery: 88,
    streak: 6,
    aura: { from: '#2dd4bf', to: '#0ea5e9' },
  },
  {
    id: 'bio-02',
    deck: 'Bio Reactor',
    front: 'Mitochondria generate ATP through which process?',
    back: 'Oxidative phosphorylation via the electron transport chain.',
    mastery: 72,
    streak: 3,
    aura: { from: '#f59e0b', to: '#ef4444' },
  },
  {
    id: 'chem-03',
    deck: 'Chem Velocity',
    front: 'What shifts equilibrium to products in exothermic reactions?',
    back: 'Lowering temperature favors product formation.',
    mastery: 64,
    streak: 2,
    aura: { from: '#8b5cf6', to: '#ec4899' },
  },
  {
    id: 'math-04',
    deck: 'Calc Pulse',
    front: 'Derivative of ln(x) is?',
    back: '1/x for x > 0.',
    mastery: 93,
    streak: 10,
    aura: { from: '#22c55e', to: '#14b8a6' },
  },
  {
    id: 'phys-05',
    deck: 'Quantum Grid',
    front: 'Planck relation connecting energy and frequency?',
    back: 'E = hf where h is Planck constant.',
    mastery: 69,
    streak: 4,
    aura: { from: '#06b6d4', to: '#6366f1' },
  },
  {
    id: 'med-06',
    deck: 'Clinical Recall',
    front: 'First-line management for anaphylaxis?',
    back: 'Immediate intramuscular epinephrine.',
    mastery: 81,
    streak: 5,
    aura: { from: '#f97316', to: '#e11d48' },
  },
  {
    id: 'pharm-07',
    deck: 'Pharma Logic',
    front: 'Why are beta blockers used post-myocardial infarction?',
    back: 'They reduce oxygen demand and lower arrhythmia risk.',
    mastery: 76,
    streak: 4,
    aura: { from: '#3b82f6', to: '#06b6d4' },
  },
  {
    id: 'immuno-08',
    deck: 'Immuno Forge',
    front: 'What is the key role of helper T cells?',
    back: 'Coordinate immune response via cytokine signaling.',
    mastery: 67,
    streak: 3,
    aura: { from: '#84cc16', to: '#22c55e' },
  },
  {
    id: 'anatomy-09',
    deck: 'Anatomy Atlas',
    front: 'Which cranial nerve controls lateral rectus muscle?',
    back: 'Abducens nerve (CN VI).',
    mastery: 90,
    streak: 9,
    aura: { from: '#10b981', to: '#14b8a6' },
  },
  {
    id: 'path-10',
    deck: 'Path Insight',
    front: 'Classic triad of nephritic syndrome?',
    back: 'Hematuria, hypertension, and edema.',
    mastery: 62,
    streak: 2,
    aura: { from: '#ef4444', to: '#f97316' },
  },
  {
    id: 'micro-11',
    deck: 'Micro Match',
    front: 'Catalase positive and coagulase positive organism?',
    back: 'Staphylococcus aureus.',
    mastery: 79,
    streak: 6,
    aura: { from: '#6366f1', to: '#8b5cf6' },
  },
  {
    id: 'ethics-12',
    deck: 'Ethics Pulse',
    front: 'Core principle behind informed consent?',
    back: 'Respect for patient autonomy through clear disclosure.',
    mastery: 85,
    streak: 8,
    aura: { from: '#14b8a6', to: '#0ea5e9' },
  },
]