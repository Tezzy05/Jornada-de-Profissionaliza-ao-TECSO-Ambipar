import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ShieldCheck, RotateCcw, LogIn, Check, ArrowUpRight, History, KeyRound } from 'lucide-react';
import { useDB } from '@/store/db';
import { useMe } from '@/store/scope';
import { ALL_PERMS, diffTemplate, PERFIS, PERM_GRUPOS, PERM_LABEL, TEMPLATES } from '@/lib/permissions';
import { fmtDateTime, nowISO } from '@/lib/dates';
import { cn, uid } from '@/lib/utils';
import { Avatar, confirmar, Drawer, Field, PageHead, toast } from '@/components/ui';
import type { PerfilBase, PermKey, Usuario } from '@/lib/types';

const ORDEM: PerfilBase[] = ['tecnico', 'coord', 'gestao', 'adm', 'consulta'];

export default function UsuariosPage() {
  const db = useDB();
  const me = useMe()!;
  const nav = useNavigate();
  const [edit, setEdit] = useState<Usuario | null>(null);
  const [busca, setBusca] = useState('');
  const users = [...db.users].filter((u) => `${u.nome} ${u.email}`.toLowerCase().includes(busca.toLowerCase())).sort((a, b) => ORDEM.indexOf(a.perfil) - ORDEM.indexOf(b.perfil) || a.nome.localeCompare(b.nome));
  const novo = (): Usuario => ({ id: '', nome: '', email: '', senha: 'planetaA', perfil: 'tecnico', cargo: PERFIS.tecnico.cargo, perms: [...TEMPLATES.tecnico], ativo: true, criadoEm: '' });

  return (
    <div>
      <PageHead crumbs="Sistema" title="Usuários e acessos">
        <button className="btn pri" onClick={() => setEdit(novo())}><Plus /> Novo usuário</button>
      </PageHead>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5 mb-4">
        {ORDEM.map((p) => (
          <div key={p} className="card p-4">
            <span className="lbl">{PERFIS[p].nome}</span>
            <b className="block text-[24px] font-display tnum">{db.users.filter((u) => u.perfil === p && u.ativo).length}</b>
            <span className="muted text-[12px]">{TEMPLATES[p].length} acessos no perfil</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="pad flex gap-3 items-center flex-wrap">
          <input id="us-busca" className="field !w-72" placeholder="Buscar por nome ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Usuário</th><th>Perfil-base</th><th>Acessos</th><th>Projetos vinculados</th><th>Status</th><th>Último acesso</th><th /></tr></thead>
            <tbody>
              {users.map((u) => {
                const dt = diffTemplate(u);
                const projs = db.projetos.filter((p) => p.tecnicos.includes(u.id));
                return (
                  <tr key={u.id} className="clickable" onClick={() => setEdit(JSON.parse(JSON.stringify(u)))}>
                    <td><div className="tc"><Avatar u={u} size="sm" /><span><b>{u.nome}</b><span className="block muted text-[12px] font-normal">{u.email}</span></span></div></td>
                    <td><span className="tag dark">{PERFIS[u.perfil].nome}</span><div className="muted text-[12px] mt-0.5">{u.cargo}</div></td>
                    <td className="text-[12.5px]">
                      <span className="tnum">{u.perms.length} de {ALL_PERMS.length}</span>
                      {(dt.extras.length > 0 || dt.removidas.length > 0) && (
                        <span className="tag violet ml-1.5">Personalizado {dt.extras.length ? `+${dt.extras.length}` : ''}{dt.removidas.length ? ` −${dt.removidas.length}` : ''}</span>
                      )}
                    </td>
                    <td className="text-[12.5px]">{u.perms.includes('projetos.todos') ? <span className="tag ok">Todos</span> : projs.length ? projs.map((p) => p.sigla).join(', ') : <span className="muted">Nenhum</span>}</td>
                    <td>{u.ativo ? <span className="tag ok">Ativo</span> : <span className="tag red">Inativo</span>}</td>
                    <td className="muted text-[12px] whitespace-nowrap">{u.ultimoAcesso ? fmtDateTime(u.ultimoAcesso) : 'Nunca'}</td>
                    <td className="text-right whitespace-nowrap">
                      {u.id !== me.id && u.ativo && (
                        <button className="btn ghost xs" title="Entrar como este usuário para conferir o que ele vê" onClick={(e) => { e.stopPropagation(); db.loginAs(u.id); nav('/painel'); toast(`Você está vendo o sistema como ${u.nome}`); }}><LogIn /> Ver como</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <UsuarioDrawer u={edit} onClose={() => setEdit(null)} />
      <div className="mt-4 flex justify-end">
        <button
          className="btn ghost sm"
          onClick={async () => {
            if (await confirmar('Restaurar a demonstração', 'Todos os dados voltam ao exemplo original, com datas recalculadas para a semana atual.', 'Restaurar', true)) {
              await db.resetDemo();
              toast('Demonstração restaurada');
            }
          }}
        >
          <RotateCcw /> Restaurar demonstração
        </button>
      </div>
    </div>
  );
}

function UsuarioDrawer({ u, onClose }: { u: Usuario | null; onClose: () => void }) {
  const db = useDB();
  const me = useMe()!;
  const [f, setF] = useState<Usuario | null>(u);
  const [projs, setProjs] = useState<string[]>([]);
  const [aba, setAba] = useState<'acessos' | 'historico'>('acessos');
  const [k, setK] = useState(u);
  if (k !== u) {
    setK(u);
    setF(u);
    setProjs(u ? db.projetos.filter((p) => p.tecnicos.includes(u.id)).map((p) => p.id) : []);
    setAba('acessos');
  }
  if (!f) return <Drawer open={false} onClose={onClose} title="">{null}</Drawer>;
  const original = db.users.find((x) => x.id === f.id);
  const dt = diffTemplate(f);
  const novo = !f.id;

  const escolherPerfil = (p: PerfilBase) => setF({ ...f, perfil: p, cargo: original && original.perfil === p ? original.cargo : PERFIS[p].cargo, perms: [...TEMPLATES[p]] });
  const toggle = (k: PermKey) => setF({ ...f, perms: f.perms.includes(k) ? f.perms.filter((x) => x !== k) : [...f.perms, k] });

  const salvar = async () => {
    if (!f.nome.trim() || !/^\S+@\S+\.\S+$/.test(f.email)) return toast('Informe nome e um e-mail válido (é o login)', true);
    if (db.users.some((x) => x.email.toLowerCase() === f.email.toLowerCase() && x.id !== f.id)) return toast('Já existe um usuário com esse e-mail', true);
    if (f.id === me.id && !f.perms.includes('usuarios.gerir')) return toast('Você não pode remover o próprio acesso de gestão de usuários', true);
    const ganhos = f.perms.filter((p) => !(original?.perms ?? []).includes(p));
    const perdas = (original?.perms ?? []).filter((p) => !f.perms.includes(p));
    if (!novo && original && (ganhos.length || perdas.length || original.perfil !== f.perfil)) {
      const ok = await confirmar(
        `Alterar acessos de ${f.nome}`,
        <div className="grid gap-2">
          {original.perfil !== f.perfil && <p>Perfil-base: <b>{PERFIS[original.perfil].nome}</b> → <b>{PERFIS[f.perfil].nome}</b></p>}
          {ganhos.length > 0 && <div><b className="text-[var(--ok)]">Passa a ter ({ganhos.length}):</b><ul className="list-disc ml-5 text-[13px]">{ganhos.map((g) => <li key={g}>{PERM_LABEL[g]}</li>)}</ul></div>}
          {perdas.length > 0 && <div><b className="text-[var(--danger)]">Deixa de ter ({perdas.length}):</b><ul className="list-disc ml-5 text-[13px]">{perdas.map((g) => <li key={g}>{PERM_LABEL[g]}</li>)}</ul></div>}
        </div>,
        'Salvar alterações',
      );
      if (!ok) return;
    }
    const id = f.id || 'u_' + uid();
    db.mut((d) => {
      const dados = { ...f, id, nome: f.nome.trim(), email: f.email.trim().toLowerCase(), criadoEm: f.criadoEm || nowISO() };
      if (novo) d.users.push(dados);
      else d.users = d.users.map((x) => (x.id === id ? dados : x));
      d.projetos.forEach((p) => {
        const tem = p.tecnicos.includes(id);
        if (projs.includes(p.id) && !tem) p.tecnicos.push(id);
        if (!projs.includes(p.id) && tem) p.tecnicos = p.tecnicos.filter((x) => x !== id);
      });
    });
    const textos: string[] = [];
    if (novo) textos.push(`Usuário criado com o perfil ${PERFIS[f.perfil].nome}${dt.extras.length || dt.removidas.length ? ' (personalizado)' : ''}`);
    else {
      if (original && original.perfil !== f.perfil) textos.push(`Perfil-base alterado de ${PERFIS[original.perfil].nome} para ${PERFIS[f.perfil].nome}`);
      if (ganhos.length) textos.push(`Acessos liberados: ${ganhos.map((g) => PERM_LABEL[g]).join('; ')}`);
      if (perdas.length) textos.push(`Acessos retirados: ${perdas.map((g) => PERM_LABEL[g]).join('; ')}`);
      if (original && original.ativo !== f.ativo) textos.push(f.ativo ? 'Usuário reativado' : 'Usuário inativado');
      if (original && original.senha !== f.senha) textos.push('Senha redefinida');
    }
    const antes = db.projetos.filter((p) => p.tecnicos.includes(id)).map((p) => p.id);
    const vinc = projs.filter((p) => !antes.includes(p));
    const desv = antes.filter((p) => !projs.includes(p));
    if (vinc.length) textos.push(`Vinculado a: ${vinc.map((p) => db.projetos.find((x) => x.id === p)?.nome).join(', ')}`);
    if (desv.length) textos.push(`Desvinculado de: ${desv.map((p) => db.projetos.find((x) => x.id === p)?.nome).join(', ')}`);
    textos.forEach((t) => db.log(novo ? 'usuario' : 'acesso', t, id));
    toast(novo ? `Usuário criado. Login: ${f.email} · senha ${f.senha}` : 'Acessos atualizados');
    onClose();
  };

  const historico = db.audit.filter((a) => a.alvo === f.id);

  return (
    <Drawer
      open={!!u}
      onClose={onClose}
      title={novo ? 'Novo usuário' : f.nome}
      sub={novo ? 'Escolha um perfil-base: os acessos já vêm marcados e podem ser ajustados.' : `${f.email} · criado em ${fmtDateTime(f.criadoEm)}`}
      footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn pri" onClick={salvar}><Check /> {novo ? 'Criar usuário' : 'Salvar alterações'}</button></>}
    >
      {!novo && (
        <div className="tabs">
          <button className={cn('tab', aba === 'acessos' && 'on')} onClick={() => setAba('acessos')}><ShieldCheck className="w-3.5 h-3.5" /> Dados e acessos</button>
          <button className={cn('tab', aba === 'historico' && 'on')} onClick={() => setAba('historico')}><History className="w-3.5 h-3.5" /> Histórico <span className="pc">{historico.length}</span></button>
        </div>
      )}

      {aba === 'historico' && !novo ? (
        <div className="grid">
          {historico.map((h) => (
            <div key={h.id} className="chk !items-start">
              <span className="tag tnum whitespace-nowrap">{fmtDateTime(h.em)}</span>
              <span className="text-[13px]">{h.texto}<span className="muted block text-[12px]">por {db.users.find((x) => x.id === h.por)?.nome ?? 'sistema'}</span></span>
            </div>
          ))}
          {historico.length === 0 && <p className="muted">Sem alterações registradas.</p>}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome completo" req className="col-span-2"><input id="us-nome" className="field" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></Field>
            <Field label="E-mail (login)" req><input id="us-email" className="field" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="nome.sobrenome@tecso.demo" /></Field>
            <Field label="Cargo"><input id="us-cargo" className="field" value={f.cargo} onChange={(e) => setF({ ...f, cargo: e.target.value })} /></Field>
            <Field label={novo ? 'Senha provisória' : 'Senha'}>
              <div className="flex gap-2"><input id="us-senha" className="field" value={f.senha} onChange={(e) => setF({ ...f, senha: e.target.value })} /><button className="icon-btn border border-[var(--line)]" title="Gerar senha" aria-label="Gerar senha" onClick={() => setF({ ...f, senha: 'Tecso' + Math.floor(1000 + Math.random() * 9000) })}><KeyRound /></button></div>
            </Field>
            <Field label="Situação">
              <label className="flex items-center gap-2 h-[42px]"><input type="checkbox" checked={f.ativo} disabled={f.id === me.id} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /> Usuário ativo</label>
            </Field>
          </div>

          <div>
            <span className="lbl block mb-2">Perfil-base</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {ORDEM.map((p) => (
                <button key={p} className={cn('panel p-3 text-left transition', f.perfil === p ? '!border-[var(--ink)] shadow-[0_0_0_2px_var(--ink)]' : 'hover:border-[var(--leaf)]')} onClick={() => escolherPerfil(p)}>
                  <b className="font-display text-[13.5px] flex items-center gap-1.5">{f.perfil === p && <Check className="w-4 h-4" />}{PERFIS[p].nome}{original && original.perfil !== p && f.perfil === p && <span className="tag lime"><ArrowUpRight /> novo</span>}</b>
                  <span className="muted text-[12px] block mt-0.5 leading-snug">{PERFIS[p].desc}</span>
                </button>
              ))}
            </div>
            {(dt.extras.length > 0 || dt.removidas.length > 0) && (
              <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                <span className="tag violet">Personalizado: {dt.extras.length} a mais e {dt.removidas.length} a menos que o perfil</span>
                <button className="btn link xs" onClick={() => setF({ ...f, perms: [...TEMPLATES[f.perfil]] })}>Voltar ao padrão do perfil</button>
              </div>
            )}
          </div>

          <div>
            <span className="lbl block mb-1">Acessos ({f.perms.length} de {ALL_PERMS.length})</span>
            <div className="grid gap-3">
              {PERM_GRUPOS.map((g) => (
                <div key={g.grupo} className="panel">
                  <div className="px-3.5 py-2 font-semibold text-[12.5px] bg-[#fafbf8] border-b border-[var(--line)] rounded-t-[14px]">{g.grupo}</div>
                  {g.itens.map((i) => {
                    const on = f.perms.includes(i.k);
                    const doPerfil = TEMPLATES[f.perfil].includes(i.k);
                    return (
                      <label key={i.k} className="flex items-start gap-2.5 px-3.5 py-2 border-b last:border-0 border-[var(--line)] cursor-pointer hover:bg-[#f8fbf3]">
                        <input type="checkbox" className="mt-1" checked={on} onChange={() => toggle(i.k)} />
                        <span className="flex-1 text-[13px]">{i.t}{i.d && <span className="block muted text-[11.5px]">{i.d}</span>}</span>
                        {on !== doPerfil && <span className={cn('tag', on ? 'ok' : 'red')}>{on ? 'extra' : 'retirado'}</span>}
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div>
            <span className="lbl block mb-1">Projetos vinculados</span>
            <div className="grid gap-1.5">
              {db.projetos.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-[13px]">
                  <input type="checkbox" checked={projs.includes(p.id)} onChange={(e) => setProjs(e.target.checked ? [...projs, p.id] : projs.filter((x) => x !== p.id))} />
                  {p.nome} <span className={`tag ${p.tipo === 'aceleracao' ? 'lime' : 'blue'}`}>{p.tipo === 'aceleracao' ? 'Aceleração' : 'Cidades Circular'}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </Drawer>
  );
}
