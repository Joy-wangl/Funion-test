<template>
  <svg class="vs-lineart" viewBox="0 0 260 170" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="vsEgBase" x1="0" y1="0" x2="260" y2="170" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#7e97e2" />
        <stop offset="1" stop-color="#aab8e9" />
      </linearGradient>
      <linearGradient id="vsEgFlow" x1="0" y1="0" x2="260" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#4f7cff" />
        <stop offset="0.5" stop-color="#7b5bff" />
        <stop offset="1" stop-color="#4f7cff" />
      </linearGradient>
    </defs>
    <path class="ln" d="M18 128 C70 152 190 152 242 126" />
    <path class="ln thin" d="M34 142 C84 160 176 160 226 140" />
    <path class="ln flow" d="M18 128 C70 152 190 152 242 126" />
    <circle class="ln" cx="120" cy="44" r="14" />
    <path class="ln" d="M120 58 C114 74 112 86 116 98" />
    <path class="ln" d="M116 98 C130 106 142 112 150 124" />
    <path class="ln" d="M150 124 L159 126" />
    <path class="ln" d="M116 98 C106 108 100 118 88 120" />
    <path class="ln" d="M88 120 L80 115" />
    <path class="ln" d="M122 66 C138 70 150 66 160 56" />
    <path class="ln flow2" d="M160 56 L184 38" />
    <path class="ln" d="M118 68 C106 76 96 78 86 74" />
    <path class="spark" d="M192 34 l4 -9 4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 z" />
    <circle class="ln" cx="70" cy="36" r="12" />
    <circle class="dt" cx="65" cy="36" r="1.6" />
    <circle class="dt d2" cx="70" cy="36" r="1.6" />
    <circle class="dt d3" cx="75" cy="36" r="1.6" />
    <circle class="ln thin" cx="156" cy="22" r="8" />
    <path class="ln thin" d="M153 22 c2 -3 4 3 6 0" />
  </svg>
</template>

<style scoped>
.vs-lineart { width: 220px; height: auto; overflow: visible; }
.vs-lineart .ln { stroke: url(#vsEgBase); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.vs-lineart .thin { stroke-width: 1.8; opacity: .8; }
.vs-lineart .flow, .vs-lineart .flow2 { stroke: url(#vsEgFlow); stroke-width: 3.2; filter: drop-shadow(0 0 5px rgba(79, 124, 255, 0.55)); stroke-dasharray: 56 310; animation: vsa-dash 3s linear infinite; }
.vs-lineart .flow2 { stroke-dasharray: 16 58; animation: vsa-dash2 2.2s linear infinite; }
.vs-lineart .spark { stroke: #7b5bff; stroke-width: 2; stroke-linejoin: round; fill: rgba(123, 91, 255, 0.12); transform-box: fill-box; transform-origin: center; animation: vsa-breathe 2.6s ease-in-out infinite; }
.vs-lineart .dt { fill: #4f7cff; animation: vsa-blink 1.6s ease-in-out infinite; }
.vs-lineart .dt.d2 { animation-delay: .3s; }
.vs-lineart .dt.d3 { animation-delay: .6s; }
@keyframes vsa-dash { to { stroke-dashoffset: -366; } }
@keyframes vsa-dash2 { to { stroke-dashoffset: -74; } }
@keyframes vsa-breathe { 0%, 100% { transform: scale(1); opacity: .8; } 50% { transform: scale(1.15); opacity: 1; } }
@keyframes vsa-blink { 0%, 100% { opacity: .25; } 50% { opacity: 1; } }
</style>
