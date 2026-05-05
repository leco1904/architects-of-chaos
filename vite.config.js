import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/architects-of-chaos/', // MUSS exakt so heißen wie dein Repo-Name!
})