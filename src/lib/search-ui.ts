import { create } from "zustand";

type SearchUI = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

export const useSearchUI = create<SearchUI>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
