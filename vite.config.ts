import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { target: 'es2022' },
  // i test coprono anche gli script ETL, che stanno fuori da src/
  test: { include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'] },
})
