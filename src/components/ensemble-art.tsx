export function EnsembleArt({ locale }: { locale: 'en' | 'da' }) {
  return (
    <div className="hero-art" aria-hidden="true">
      <svg viewBox="0 0 460 400" fill="none">
        <circle cx="241" cy="171" r="130" fill="#D9DECB" />
        <path d="M0 332C140 290 320 288 460 326V400H0Z" fill="#D1D8BD" />
        {[125, 164, 203, 242, 281].map((y) => (
          <path
            key={y}
            d={`M22 ${y}C147 ${y - 35} 307 ${y + 44} 460 ${y - 4}`}
            stroke="#BAC5AB"
            strokeWidth="1"
          />
        ))}
        <ellipse cx="222" cy="353" rx="157" ry="16" fill="#BCC8A8" />
        <path
          d="M91 261L76 344M117 264L134 344M76 291H131"
          stroke="#526348"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path d="M66 265H137" stroke="#526348" strokeWidth="13" strokeLinecap="round" />
        <path
          d="M68 259L62 224Q62 215 74 215H119Q132 215 132 228V259"
          stroke="#526348"
          strokeWidth="9"
        />
        <path
          d="M308 271L291 348M339 272L355 348M293 302H351"
          stroke="#526348"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path d="M283 270H355" stroke="#526348" strokeWidth="13" strokeLinecap="round" />
        <path
          d="M288 262V224Q288 215 300 215H340Q350 215 350 228V264"
          stroke="#526348"
          strokeWidth="9"
        />
        <path
          d="M197 273L181 353M228 273L244 353M183 304H239"
          stroke="#A1744F"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path d="M175 269H249" stroke="#A1744F" strokeWidth="13" strokeLinecap="round" />
        <path
          d="M179 260L175 220Q175 211 187 211H231Q244 211 244 222V260"
          stroke="#A1744F"
          strokeWidth="9"
        />
        <path d="M197 221H223M197 233H223M197 245H223" stroke="#B78D67" strokeWidth="2" />
        <path d="M166 151L212 137L244 172L199 188Z" fill="#F9F8EE" />
        <path
          d="M175 154L208 144M181 161L214 151M187 168L220 158"
          stroke="#9CA88E"
          strokeWidth="2"
        />
        <path
          d="M200 186V327M184 339L200 327L216 339"
          stroke="#526348"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="M320 117V153" stroke="#6A7D57" strokeWidth="3" />
        <ellipse cx="313" cy="155" rx="8" ry="5" transform="rotate(-20 313 155)" fill="#6A7D57" />
        <path d="M320 117L340 111V146" stroke="#6A7D57" strokeWidth="3" />
        <ellipse cx="333" cy="148" rx="8" ry="5" transform="rotate(-20 333 148)" fill="#6A7D57" />
        <path d="M112 106V135" stroke="#9AA781" strokeWidth="3" />
        <ellipse cx="105" cy="137" rx="8" ry="5" transform="rotate(-20 105 137)" fill="#9AA781" />
      </svg>
      <div className="art-caption">
        <span>Tutti · /ˈtut.ti/ · {locale === 'da' ? 'sammen' : 'together'}</span>
        <span />
      </div>
    </div>
  );
}
