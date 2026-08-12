"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  address: string;
  postalCode: string;
  province: string;
  city: string;
  onChange: (value: { address: string; postalCode: string; province: string; city: string }) => void;
  compact?: boolean;
};

const PROVINCES = [
  ["01","Álava"],["02","Albacete"],["03","Alicante"],["04","Almería"],["33","Asturias"],
  ["05","Ávila"],["06","Badajoz"],["07","Illes Balears"],["08","Barcelona"],["48","Bizkaia"],
  ["09","Burgos"],["10","Cáceres"],["11","Cádiz"],["39","Cantabria"],["12","Castellón"],
  ["51","Ceuta"],["13","Ciudad Real"],["14","Córdoba"],["15","A Coruña"],["16","Cuenca"],
  ["17","Girona"],["18","Granada"],["19","Guadalajara"],["20","Gipuzkoa"],["21","Huelva"],
  ["22","Huesca"],["23","Jaén"],["24","León"],["25","Lleida"],["27","Lugo"],["28","Madrid"],
  ["29","Málaga"],["52","Melilla"],["30","Murcia"],["31","Navarra"],["32","Ourense"],
  ["34","Palencia"],["35","Las Palmas"],["36","Pontevedra"],["26","La Rioja"],["37","Salamanca"],
  ["38","Santa Cruz de Tenerife"],["40","Segovia"],["41","Sevilla"],["42","Soria"],["43","Tarragona"],
  ["44","Teruel"],["45","Toledo"],["46","Valencia"],["47","Valladolid"],["49","Zamora"],["50","Zaragoza"],
] as const;

type Municipality = { provincia_id?: string; nombre?: string };

const MUNICIPALITIES_URL =
  "https://raw.githubusercontent.com/codeforspain/ds-organizacion-administrativa/master/data/municipios.json";
const CACHE_KEY = "one_es_municipios_2026";

export default function SpainAddressFields({address,postalCode,province,city,onChange,compact=false}:Props) {
  const [municipalities,setMunicipalities]=useState<Municipality[]>([]);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    try {
      const cached=window.localStorage.getItem(CACHE_KEY);
      if(cached){
        const parsed=JSON.parse(cached);
        if(Array.isArray(parsed)){ setMunicipalities(parsed); return; }
      }
    } catch {}
    setLoading(true);
    fetch(MUNICIPALITIES_URL)
      .then(r=>r.ok?r.json():Promise.reject())
      .then(data=>{
        if(Array.isArray(data)){
          setMunicipalities(data);
          try{ window.localStorage.setItem(CACHE_KEY,JSON.stringify(data)); }catch{}
        }
      })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  },[]);

  const provinceId=PROVINCES.find(([,name])=>name===province)?.[0] || "";
  const cities=useMemo(
    ()=>municipalities
      .filter(m=>m.provincia_id===provinceId && m.nombre)
      .map(m=>String(m.nombre))
      .sort((a,b)=>a.localeCompare(b,"es")),
    [municipalities,provinceId]
  );

  function change(patch:Partial<Props>){
    onChange({
      address: patch.address ?? address,
      postalCode: patch.postalCode ?? postalCode,
      province: patch.province ?? province,
      city: patch.city ?? city,
    });
  }

  return (
    <div className={compact ? "oneAddress oneAddressCompact" : "oneAddress"}>
      <label>Dirección
        <input value={address} onChange={e=>change({address:e.target.value})} placeholder="Calle, número, piso..." />
      </label>
      <label>Código postal
        <input value={postalCode} inputMode="numeric" maxLength={5}
          onChange={e=>change({postalCode:e.target.value.replace(/\D/g,"").slice(0,5)})} placeholder="CP" />
      </label>
      <label>Provincia
        <select value={province} onChange={e=>change({province:e.target.value,city:""})}>
          <option value="">Seleccionar</option>
          {PROVINCES.map(([id,name])=><option key={id} value={name}>{name}</option>)}
        </select>
      </label>
      <label>Población
        {cities.length ? (
          <select value={city} onChange={e=>change({city:e.target.value})}>
            <option value="">Seleccionar población</option>
            {cities.map(name=><option key={name} value={name}>{name}</option>)}
          </select>
        ) : (
          <input value={city} onChange={e=>change({city:e.target.value})}
            placeholder={province ? (loading ? "Cargando poblaciones..." : "Escribe la población") : "Selecciona provincia"} />
        )}
      </label>
      <style jsx>{`
        .oneAddress{display:grid;grid-template-columns:2fr .65fr 1fr 1.2fr;gap:10px;align-items:end}
        label{display:grid;gap:5px;font-size:.62rem;font-weight:800;color:#5f5955}
        input,select{width:100%;min-width:0;height:38px;padding:0 9px;border:1px solid #ddd6d0;border-radius:8px;background:white;font:inherit;font-weight:600}
        .oneAddressCompact label{font-size:.55rem}.oneAddressCompact input,.oneAddressCompact select{height:35px}
        @media(max-width:800px){.oneAddress{grid-template-columns:1fr 1fr}}
        @media(max-width:520px){.oneAddress{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}
