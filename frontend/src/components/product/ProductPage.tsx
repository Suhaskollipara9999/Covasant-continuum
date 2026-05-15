import { useAppStore, getFilteredArtefacts } from '../../stores/appStore';
import { PRODUCTS, TYPE_LABELS } from '../../data';
import ArtefactCard from '../ui/ArtefactCard';

export default function ProductPage() {
  const store = useAppStore();
  const { artefacts, role, prod, filterType, filterVersion, query, goHome, setFilterType, setFilterVersion, setView } = store;
  const p = prod ? PRODUCTS[prod] : null;
  const arts = getFilteredArtefacts(artefacts, role, prod, filterType, filterVersion, query);
  const pills = ['all','release-notes','video','guide','documentation','newsletter'];

  return (
    <div style={{padding:'18px 20px'}} className="fade-up">
      <a onClick={goHome} style={{padding:'4px 9px',borderRadius:7,background:'transparent',border:'1.5px solid var(--bd)',color:'var(--t2)',fontSize:10.5,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',marginBottom:14,textDecoration:'none'}}>← Continuum Home</a>

      {p ? (
        <div style={{background:'linear-gradient(135deg,var(--c2),var(--card))',border:'1.5px solid var(--bd)',borderRadius:12,padding:'18px 22px',marginBottom:16,boxShadow:'var(--sh)',borderTop:`3px solid ${p.clr}`}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:9.5,fontWeight:700,letterSpacing:.7,textTransform:'uppercase',padding:'3px 9px',borderRadius:20,marginBottom:9,background:p.bg,color:p.clr,border:`1.5px solid ${p.clr}30`}}>● {p.n} · Active</div>
          <div style={{fontSize:18,fontWeight:800,letterSpacing:-.4,marginBottom:5,color:'var(--t1)'}}>{p.full}</div>
          <div style={{fontSize:12.5,color:'var(--t2)',lineHeight:1.65,marginBottom:14,maxWidth:460}}>{p.d}</div>
          <div style={{display:'flex',gap:22}}>
            {[{v:p.docs,l:'Documents'},{v:p.vids,l:'Videos'},{v:p.rels,l:'Releases'},{v:arts.length,l:'Visible'}].map((s,i)=>(
              <div key={i}><div style={{fontSize:19,fontWeight:800,color:p.clr}}>{s.v}</div><div style={{fontSize:9.5,color:'var(--t3)',textTransform:'uppercase',letterSpacing:.5,fontWeight:700}}>{s.l}</div></div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{marginBottom:14}}>
          <div style={{fontSize:19,fontWeight:800,letterSpacing:-.4,marginBottom:3}}>{TYPE_LABELS[filterType]||'All Artefacts'}</div>
          <div style={{fontSize:12,color:'var(--t2)'}}>{arts.length} artefacts{query?` matching "${query}"`:''}</div>
        </div>
      )}

      {role==='customer'&&<div style={{background:'rgba(37,99,235,.07)',border:'1.5px solid rgba(37,99,235,.15)',borderRadius:8,padding:'8px 13px',marginBottom:13,fontSize:12,color:'var(--blue)'}}>Customer view — Acme Corp project-scoped content only.</div>}

      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:13}}>
        {pills.map(t=>{const isOn=filterType===t;return(
          <a key={t} onClick={()=>{setFilterType(t);setFilterVersion(null);setView('product');}} style={{padding:'4px 12px',borderRadius:20,fontSize:11.5,cursor:'pointer',border:`1.5px solid ${isOn?'var(--blue)':'var(--bd)'}`,color:isOn?'var(--blue)':'var(--t2)',background:isOn?'rgba(37,99,235,.07)':'var(--card)',fontWeight:600,textDecoration:'none',display:'inline-flex',alignItems:'center'}}>{TYPE_LABELS[t]||t}</a>
        );})}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))',gap:10}}>
        {arts.length?arts.map(a=><ArtefactCard key={a.id} artefact={a}/>):<div style={{textAlign:'center',padding:40,color:'var(--t3)',gridColumn:'1/-1'}}>No artefacts match this filter.</div>}
      </div>
    </div>
  );
}
