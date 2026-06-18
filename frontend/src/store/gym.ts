import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Gym } from '@/types';
import { gymApi } from '@/utils/api';

interface GymState {
  currentGym: Gym | null;
  gyms: Gym[];
  isLoading: boolean;
  error: string | null;
  fetchGyms: () => Promise<void>;
  setCurrentGym: (gym: Gym | null) => void;
  setGyms: (gyms: Gym[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useGymStore = create<GymState>()(
  persist(
    (set) => ({
      currentGym: null,
      gyms: [],
      isLoading: false,
      error: null,

      fetchGyms: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await gymApi.getGyms();
          set({ gyms: data });
          if (data.length > 0 && !useGymStore.getState().currentGym) {
            set({ currentGym: data[0] });
          }
        } catch (err) {
          set({ error: err instanceof Error ? err.message : '获取岩馆列表失败' });
        } finally {
          set({ isLoading: false });
        }
      },

      setCurrentGym: (gym: Gym | null) => {
        set({ currentGym: gym });
      },

      setGyms: (gyms: Gym[]) => {
        set({ gyms });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'gym-storage',
      partialize: (state) => ({ currentGym: state.currentGym }),
    }
  )
);

export default useGymStore;
