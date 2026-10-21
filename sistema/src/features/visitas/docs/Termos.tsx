import { useState } from 'react';
import { Paperclip, Plus, Printer, Lock } from 'lucide-react';
import { useDB } from '@/store/db';
import { can } from '@/lib/permissions';
import { cn, maskCPF, uid } from '@/lib/utils';
import { fmt, nowISO } from '@/lib/dates';
import { dataURLToBlob, putMedia } from '@/lib/media';
import { anexarArquivo } from '@/lib/upload';
import { Bar, Field, Modal, SignaturePad, toast } from '@/components/ui';
import { imprimir } from '@/components/Print';
import type { Anexo, Termo } from '@/lib/types';
import type { DocProps } from './types';

function TermoTexto({ nac, prof, cidade, uf, data }: { nac: string; prof: string; cidade: string; uf: string; data: string }) {
  const b = (n: number) => '_'.repeat(n);
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, lineHeight: 1.8 }}>
      <p style={{ textAlign: 'center', fontWeight: 700, marginBottom: 10 }}>TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM E SOM</p>
      <p>
        {b(34)} (nome completo), <b>{nac}</b> (nacionalidade), {b(12)} (estado civil), <b>{prof}</b> (profissão), portador(a) do RG nº {b(12)}, inscrito(a) no CPF sob nº {b(14)}, residente à {b(30)}, nº {b(5)}, compl. {b(6)}, na cidade de {b(14)} do estado de {b(4)}, AUTORIZO o uso de imagem e som em todo e qualquer material entre fotos, documentos e outros meios de comunicação, para ser utilizada em campanhas promocionais e institucionais da AMBIPAR ENVIRONMENT RESIDENCIAL COLLECTION SA, CNPJ 10.652.751/0001-46, e seus parceiros […]
      </p>
      <p style={{ marginTop: 10 }}>{cidade}/{uf}, {fmt(data)}</p>
      <p style={{ marginTop: 26, textAlign: 'center' }}>{b(40)}<br />Assinatura</p>
    </div>
  );
}

export default function Termos({ v, ro, upd, me, online }: DocProps) {
  const cfg = useDB((s) => s.config.termo);
  const mut = useDB((s) => s.mut);
  const [aba, setAba] = useState<'lista' | 'modelo'>('lista');
  const [modal, setModal] = useState<{ idx: number | null } | null>(null);
  const [tm, setTm] = useState(cfg);
  const [copias, setCopias] = useState(Math.max(1, v.termos.length));
  const [vias, setVias] = useState(true);
  const n = v.termos.filter((t) => t.assinado).length;
  const verCPF = can(me, 'dados.cpf');
  const podeModelo = can(me, 'termos.modelo') || can(me, 'visitas.preencher');

  return (
    <div>
      <div className="backbar"><h2>Termos de uso de imagem</h2><span className="tag tnum">{n} de {v.termos.length} assinados</span></div>
      <div className="tabs mb-3.5">
        <button className={cn('tab', aba === 'lista' && 'on')} onClick={() => setAba('lista')}>Cooperados</button>
        <button className={cn('tab', aba === 'modelo' && 'on')} onClick={() => setAba('modelo')}>Modelo padrão para impressão</button>
      </div>

      {aba === 'lista' ? (
        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <div className="card">
            <div className="pad pb-2 flex justify-between items-center gap-3 flex-wrap">
              <h3 className="m-0 text-[15px] font-bold">Cooperados ativos</h3>
              {!ro && <button className="btn pri sm" onClick={() => setModal({ idx: null })}><Plus /> Novo termo</button>}
            </div>
            <div className="tbl-wrap">
              <table>
                <thead><tr><th>Cooperado(a)</th><th>CPF</th><th>Termo</th><th /></tr></thead>
                <tbody>
                  {v.termos.map((t, i) => (
                    <tr key={t.id}>
                      <td><b>{t.nome}</b></td>
                      <td className="muted tnum">{t.cpf ? (verCPF ? t.cpf : maskCPF(t.cpf)) : '—'}</td>
                      <td>{t.assinado ? <span className="tag ok">{t.anexo ? 'Papel anexado' : 'Assinado · 2 vias'}</span> : <span className="tag warn">Pendente</span>}</td>
                      <td className="text-right">{!t.assinado && !ro && <button className="btn ghost sm" onClick={() => setModal({ idx: i })}>Coletar</button>}</td>
                    </tr>
                  ))}
                  {v.termos.length === 0 && (
                    <tr><td colSpan={4} className="muted">Nenhum cooperado cadastrado. Use "Novo termo" para incluir.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card pad self-start">
            <h3 className="text-[15px] font-bold">Coleta</h3>
            <p className="muted text-[13px] mt-1">Aceite presencial, em 2 vias. Colha a assinatura na tela ou anexe a foto/PDF do termo assinado em papel.</p>
            <div className="kpi !px-0 !pb-0"><span>Coletados</span><b className="tnum">{n} / {v.termos.length}</b><Bar v={v.termos.length ? (n / v.termos.length) * 100 : 0} /></div>
            <div className="info mt-4 flex gap-2"><Lock className="w-4 h-4 flex-none mt-0.5" /> CPF e RG são dados pessoais (LGPD). Nos perfis sem permissão aparecem mascarados.</div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="card pad grid gap-2.5 self-start">
            <h3 className="text-[15px] font-bold">Campos fixos do modelo</h3>
            <p className="muted text-[13px]">Saem preenchidos em todos os termos impressos. Nome, estado civil, RG, CPF, endereço e assinatura ficam em branco para o cooperado.</p>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Nacionalidade"><input id="tm-nac" className="field" value={tm.nac} onChange={(e) => setTm({ ...tm, nac: e.target.value })} /></Field>
              <Field label="Profissão"><input id="tm-prof" className="field" value={tm.prof} onChange={(e) => setTm({ ...tm, prof: e.target.value })} /></Field>
              <Field label="Cidade da assinatura"><input id="tm-cid" className="field" value={tm.cidade} onChange={(e) => setTm({ ...tm, cidade: e.target.value })} /></Field>
              <Field label="UF"><input id="tm-uf" className="field" value={tm.uf} onChange={(e) => setTm({ ...tm, uf: e.target.value })} /></Field>
              <Field label="Data da visita"><input className="field" value={fmt(v.data)} disabled /></Field>
              <Field label="Nº de cooperados (cópias)"><input id="tm-cop" type="number" min={1} className="field" value={copias} onChange={(e) => setCopias(+e.target.value)} /></Field>
            </div>
            <label className="na !text-[13px] !text-[var(--text)]"><input type="checkbox" checked={vias} onChange={(e) => setVias(e.target.checked)} /> Imprimir em 2 vias</label>
            <div className="flex gap-2.5 flex-wrap">
              {podeModelo && (
                <button className="btn dark" onClick={() => { mut((d) => { d.config.termo = tm; }); toast('Modelo padrão salvo. Vale para as próximas impressões.'); }}>Salvar modelo padrão</button>
              )}
              <button
                className="btn pri"
                onClick={() => {
                  const nv = vias ? 2 : 1;
                  imprimir(
                    <div>
                      {Array.from({ length: Math.max(1, copias) * nv }, (_, i) => (
                        <div key={i} className="pbreak" style={{ padding: 30 }}>
                          <TermoTexto {...tm} data={v.data} />
                          <p style={{ fontSize: 10, color: '#888', marginTop: 20 }}>Via {(i % nv) + 1} de {nv}</p>
                        </div>
                      ))}
                    </div>,
                  );
                }}
              >
                <Printer /> Imprimir termos
              </button>
            </div>
          </div>
          <div className="card pad"><h3 className="text-[15px] font-bold mb-3">Pré-visualização</h3><div className="border border-[var(--line)] rounded-[10px] p-4 bg-[#fcfdfb]"><TermoTexto {...tm} data={v.data} /></div></div>
        </div>
      )}

      <TermoModal
        open={!!modal}
        termo={modal && modal.idx !== null ? v.termos[modal.idx] : null}
        prof={cfg.prof}
        nac={cfg.nac}
        meId={me.id}
        onClose={() => setModal(null)}
        onSave={(t) => {
          upd((x) => {
            if (modal?.idx != null) x.termos[modal.idx] = t;
            else x.termos.push(t);
          });
          setModal(null);
          toast(online ? 'Termo salvo e sincronizado' : 'Termo salvo no dispositivo');
        }}
      />
    </div>
  );
}

function TermoModal({ open, termo, prof, nac, meId, onClose, onSave }: { open: boolean; termo: Termo | null; prof: string; nac: string; meId: string; onClose: () => void; onSave: (t: Termo) => void }) {
  const [f, setF] = useState({ nome: '', cpf: '', rg: '', estadoCivil: 'Solteiro(a)', endereco: '' });
  const [sig, setSig] = useState<string | null>(null);
  const [anexo, setAnexo] = useState<Anexo | null>(null);
  const [key, setKey] = useState('');
  const k = (termo?.id ?? 'novo') + String(open);
  if (k !== key) {
    setKey(k);
    setF({ nome: termo?.nome ?? '', cpf: '', rg: '', estadoCivil: 'Solteiro(a)', endereco: '' });
    setSig(null);
    setAnexo(null);
  }
  const salvar = async () => {
    if (!f.nome.trim()) return toast('Informe o nome completo', true);
    if (!f.cpf.trim() || !f.rg.trim() || !f.endereco.trim()) return toast('Preencha RG, CPF e endereço', true);
    if (!sig && !anexo) return toast('Colha a assinatura na tela ou anexe o termo em papel', true);
    const assinatura = sig ? await putMedia(await dataURLToBlob(sig), 'assinatura.png') : undefined;
    onSave({ id: termo?.id ?? uid(), nome: f.nome.trim(), cpf: f.cpf, rg: f.rg, estadoCivil: f.estadoCivil, endereco: f.endereco, assinado: true, assinatura, anexo: anexo ?? undefined, em: nowISO() });
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Termo de uso de imagem"
      footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn pri" onClick={salvar}>Salvar termo</button></>}
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Nome completo" req><input id="tr-nome" className="field" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></Field>
        <Field label="Profissão"><input className="field" value={prof} disabled /></Field>
        <Field label="Nacionalidade"><input className="field" value={nac} disabled /></Field>
        <Field label="Estado civil" req>
          <select id="tr-ec" className="field" value={f.estadoCivil} onChange={(e) => setF({ ...f, estadoCivil: e.target.value })}>
            {['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Viúvo(a)'].map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="RG" req><input id="tr-rg" className="field" placeholder="00.000.000-0" value={f.rg} onChange={(e) => setF({ ...f, rg: e.target.value })} /></Field>
        <Field label="CPF" req><input id="tr-cpf" className="field" placeholder="000.000.000-00" value={f.cpf} onChange={(e) => setF({ ...f, cpf: e.target.value })} /></Field>
      </div>
      <Field label="Endereço (rua, nº, compl., cidade/UF)" req><input id="tr-end" className="field" value={f.endereco} onChange={(e) => setF({ ...f, endereco: e.target.value })} /></Field>
      <Field label={<>Assinatura na tela <span className="muted font-normal">— ou anexe o termo assinado em papel</span></>}>
        <SignaturePad onChange={setSig} />
      </Field>
      <div className="flex items-center gap-3 flex-wrap">
        <button className="photo-btn" onClick={async () => { const a = await anexarArquivo(meId, 'image/*,application/pdf'); if (a) setAnexo(a); }}><Paperclip /> Anexar termo em papel</button>
        {anexo && <span className="tag ok">{anexo.nome}</span>}
      </div>
    </Modal>
  );
}
