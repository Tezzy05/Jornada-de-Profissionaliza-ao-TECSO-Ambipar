import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, History, Rocket, MapPin, Trash2 } from 'lucide-react';
import { useDB, log } from '@/store/db';
import { useMe, useScope } from '@/store/scope';
import { can } from '@/lib/permissions';
import { uid } from '@/lib/utils';
import { Avatar, Field, Modal, PageHead, toast } from '@/components/ui';
import type { Coop, Endereco } from '@/lib/types';
import { integracaoStatus, naAceleracao } from '@/features/aceleracao/logic';

export default function GruposPage() {
  const db = useDB();
  const me = useMe()!;
  const scope = useScope();
  const nav = useNavigate();
  const [novo, setNovo] = useState(false);

  return (
    <div>
      <PageHead crumbs="Cooperativas" title="Grupos parceiros" sub="Cooperativas e associações parceiras.">
        {can(me, 'grupos.cadastrar') && <button className="btn pri" onClick={() => setNovo(true)}><Plus /> Novo grupo</button>}
      </PageHead>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(310px,1fr))]">
        {scope.coops.map((c) => {
          const projs = db.projetos.filter((p) => p.coops.includes(c.id));
          const tec = db.users.find((u) => u.id === c.tecnicoId);
          const ig = integracaoStatus(db, c.id);
          return (
            <div key={c.id} className="card overflow-hidden flex flex-col">
              <div className="p-4 text-white relative" style={{ background: 'linear-gradient(135deg,var(--ink),#1c4a3a)' }}>
                <b className="font-display text-[18px] block pr-24">{c.nome}</b>
                <span className="text-[12px] text-[#9fb6a3] flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.cidade} · {c.uf}</span>
                <span className="tag lime absolute right-3.5 top-3.5">{c.classificacao}</span>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 p-4 text-[13px] m-0">
                <dt className="muted">Endereços</dt>
                <dd className="m-0 grid gap-1">{c.enderecos.map((e) => <span key={e.tipo}><span className={`tag ${e.tipo === 'Matriz' ? 'dark' : ''}`}>{e.tipo}</span> {e.end}</span>)}</dd>
                <dt className="muted">Liderança</dt><dd className="m-0">{c.lideranca} · {c.contato}</dd>
                <dt className="muted">Rede</dt><dd className="m-0">{c.rede}</dd>
                <dt className="muted">Técnico</dt><dd className="m-0 flex items-center gap-1.5"><Avatar u={tec} size="xs" />{tec?.nome}</dd>
                <dt className="muted">Projetos</dt><dd className="m-0 flex gap-1 flex-wrap">{projs.map((p) => <span key={p.id} className={`tag ${p.tipo === 'aceleracao' ? 'lime' : 'blue'}`}>{p.nome}</span>)}</dd>
                {ig.aplica && (<><dt className="muted">Integração</dt><dd className="m-0">{ig.completa ? <span className="tag ok">Completa</span> : <span className="tag warn">{ig.feitos}/{ig.total} itens</span>}</dd></>)}
              </dl>
              <div className="flex gap-2 px-4 pb-4 mt-auto flex-wrap">
                {naAceleracao(db, c.id) && can(me, 'aceleracao.ver') && <button className="btn ghost sm" onClick={() => nav(`/aceleracao/${c.id}`)}><Rocket /> Jornada</button>}
                {can(me, 'coop.historico') && <button className="btn ghost sm" onClick={() => nav(`/historico?coop=${c.id}`)}><History /> Histórico</button>}
              </div>
            </div>
          );
        })}
      </div>
      <NovoGrupo open={novo} onClose={() => setNovo(false)} />
    </div>
  );
}

function NovoGrupo({ open, onClose }: { open: boolean; onClose: () => void }) {
  const db = useDB();
  const tecs = db.users.filter((u) => u.ativo && u.perfil === 'tecnico');
  const blank = () => ({ nome: '', sigla: '', cnpj: '', cidade: '', uf: 'DF', lideranca: '', contato: '', rede: 'Sem rede', classificacao: 'Em integração' as Coop['classificacao'], tecnicoId: tecs[0]?.id ?? '', ativos: 10, enderecos: [{ tipo: 'Matriz', end: '' }] as Endereco[], projetos: [] as string[] });
  const [f, setF] = useState(blank);
  const [k, setK] = useState(open);
  if (k !== open) {
    setK(open);
    if (open) setF(blank());
  }
  const salvar = () => {
    if (!f.nome.trim() || !f.cidade.trim() || !f.enderecos[0].end.trim()) return toast('Preencha nome, cidade e o endereço da matriz', true);
    const id = 'c_' + uid();
    db.mut((d) => {
      d.coops.push({ id, nome: f.nome.trim(), sigla: (f.sigla || f.nome.replace(/[^A-Za-z]/g, '').slice(0, 2)).toUpperCase(), cnpj: f.cnpj, razaoSocial: f.nome.trim(), cidade: f.cidade, uf: f.uf, enderecos: f.enderecos.filter((e) => e.end.trim()), lideranca: f.lideranca, contato: f.contato, rede: f.rede, classificacao: f.classificacao, tecnicoId: f.tecnicoId, ativos: f.ativos });
      f.projetos.forEach((pid) => {
        const p = d.projetos.find((x) => x.id === pid)!;
        p.coops.push(id);
        if (p.tipo === 'aceleracao') d.integracoes.push({ coopId: id, itens: {} });
      });
    });
    log('sistema', `Grupo parceiro cadastrado: ${f.nome}`, id);
    toast(f.projetos.some((p) => db.projetos.find((x) => x.id === p)?.tipo === 'aceleracao') ? 'Grupo cadastrado. O checklist de integração já está disponível.' : 'Grupo cadastrado');
    onClose();
  };
  const tipos: Endereco['tipo'][] = ['Matriz', 'Filial', 'Administrativo'];
  return (
    <Modal open={open} onClose={onClose} title="Novo grupo parceiro" wide footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn pri" onClick={salvar}>Cadastrar grupo</button></>}>
      <div className="grid sm:grid-cols-[2fr_100px_1fr_80px] gap-3">
        <Field label="Nome" req><input id="ng-nome" className="field" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></Field>
        <Field label="Sigla"><input id="ng-sigla" className="field" maxLength={3} value={f.sigla} onChange={(e) => setF({ ...f, sigla: e.target.value })} /></Field>
        <Field label="Cidade" req><input id="ng-cid" className="field" value={f.cidade} onChange={(e) => setF({ ...f, cidade: e.target.value })} /></Field>
        <Field label="UF" req><input id="ng-uf" className="field" maxLength={2} value={f.uf} onChange={(e) => setF({ ...f, uf: e.target.value.toUpperCase() })} /></Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="CNPJ"><input id="ng-cnpj" className="field" value={f.cnpj} onChange={(e) => setF({ ...f, cnpj: e.target.value })} /></Field>
        <Field label="Liderança"><input id="ng-lid" className="field" value={f.lideranca} onChange={(e) => setF({ ...f, lideranca: e.target.value })} /></Field>
        <Field label="Contato"><input id="ng-cont" className="field" value={f.contato} onChange={(e) => setF({ ...f, contato: e.target.value })} /></Field>
        <Field label="Rede"><input id="ng-rede" className="field" value={f.rede} onChange={(e) => setF({ ...f, rede: e.target.value })} /></Field>
        <Field label="Técnico de referência"><select id="ng-tec" className="field" value={f.tecnicoId} onChange={(e) => setF({ ...f, tecnicoId: e.target.value })}>{tecs.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></Field>
        <Field label="Cooperados ativos"><input id="ng-at" type="number" min={1} className="field" value={f.ativos} onChange={(e) => setF({ ...f, ativos: +e.target.value })} /></Field>
      </div>
      <div className="grid gap-2">
        <span className="fl"><label className="!mb-0">Endereços (matriz, filiais e administrativo)</label></span>
        {f.enderecos.map((e, i) => (
          <div key={i} className="grid grid-cols-[150px_1fr_32px] gap-2">
            <select className="field" value={e.tipo} disabled={i === 0} onChange={(ev) => { const x = [...f.enderecos]; x[i] = { ...e, tipo: ev.target.value as Endereco['tipo'] }; setF({ ...f, enderecos: x }); }} aria-label="Tipo de endereço">{tipos.map((t) => <option key={t}>{t}</option>)}</select>
            <input className="field" value={e.end} placeholder="Rua, número, bairro" onChange={(ev) => { const x = [...f.enderecos]; x[i] = { ...e, end: ev.target.value }; setF({ ...f, enderecos: x }); }} aria-label="Endereço" />
            {i > 0 ? <button className="icon-btn" aria-label="Remover endereço" onClick={() => setF({ ...f, enderecos: f.enderecos.filter((_, j) => j !== i) })}><Trash2 /></button> : <span />}
          </div>
        ))}
        <button className="btn ghost xs justify-self-start" onClick={() => setF({ ...f, enderecos: [...f.enderecos, { tipo: 'Filial', end: '' }] })}><Plus /> Endereço</button>
      </div>
      <Field label="Projetos">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {db.projetos.map((p) => (
            <label key={p.id} className="inline-flex gap-1.5 items-center">
              <input type="checkbox" checked={f.projetos.includes(p.id)} onChange={(e) => setF({ ...f, projetos: e.target.checked ? [...f.projetos, p.id] : f.projetos.filter((x) => x !== p.id) })} />
              {p.nome}
            </label>
          ))}
        </div>
      </Field>
    </Modal>
  );
}
