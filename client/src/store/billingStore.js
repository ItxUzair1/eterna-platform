import { create } from 'zustand';

const useBillingStore = create((set, get) => ({
  upgradeOpen: false,
  code: null,
  attemptedAction: null,
  selection: { plan: 'individual', seats: 1, storageGB: 0 },
  entitlements: null,

  openUpgradeModal: ({ code, attemptedAction }) => set({ upgradeOpen: true, code, attemptedAction }),
  closeUpgradeModal: () => set({ upgradeOpen: false }),
  setSelection: (selection) => set({ selection: { ...get().selection, ...selection } }),
  setEntitlements: (entitlements) => set({ entitlements }),
}));

export default useBillingStore;

