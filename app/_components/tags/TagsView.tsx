"use client";

import { useEffect, useRef, useState } from "react";
import type { TxType } from "@/lib/finance";
import {
  addFinanceTag,
  addTodoTag,
  deleteTag,
  seedDefaultFinanceTags,
  seedDefaultTodoTags,
  tagBg,
  updateTag,
  useFinanceTags,
  useTodoTags,
  type TagOption,
} from "@/lib/tags";
import CardSkeletons from "../board/CardSkeletons";
import Icon from "../Icon";
import { useUser } from "../UserContext";

// Hidden native color input behind a swatch-sized label.
function ColorSwatch({
  color,
  label,
  onChange,
  onCommit,
}: {
  color: string;
  label: string;
  onChange: (color: string) => void;
  onCommit?: () => void;
}) {
  return (
    <label
      title={label}
      className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-[10px] border-[1.5px] border-line-soft transition-transform active:scale-95"
      style={{ background: color }}
    >
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        aria-label={label}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </label>
  );
}

function TagRow({
  tag,
  onUpdate,
  onDelete,
}: {
  tag: TagOption & { id: string };
  onUpdate: (data: Partial<TagOption>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color);

  function commitName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === tag.name) {
      setName(tag.name);
      return;
    }
    onUpdate({ name: trimmed });
  }

  function commitColor() {
    if (color !== tag.color) onUpdate({ color });
  }

  return (
    <div className="flex items-center gap-2.5 rounded-[14px] border-[1.5px] border-line-soft bg-card p-2.5">
      <ColorSwatch
        color={color}
        label={`Color for "${tag.name}"`}
        onChange={setColor}
        onCommit={commitColor}
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        aria-label={`Rename "${tag.name}"`}
        className="min-w-0 flex-1 rounded-lg border-[1.5px] border-transparent bg-transparent px-2 py-1.5 text-[14px] font-bold text-ink outline-none transition-colors focus:border-line focus:bg-panel"
      />
      <span
        className="hidden shrink-0 rounded-lg px-2.5 py-[3px] text-[11.5px] font-extrabold tracking-[0.02em] sm:inline"
        style={{ background: tagBg(color), color }}
      >
        {name.trim() || tag.name}
      </span>
      <button
        onClick={onDelete}
        aria-label={`Delete "${tag.name}"`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-soft transition-colors hover:bg-primary/6 hover:text-primary"
      >
        <Icon name="delete" size={17} />
      </button>
    </div>
  );
}

function AddTagForm({
  existingNames,
  onAdd,
}: {
  existingNames: string[];
  onAdd: (data: TagOption) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#dc2b54");

  const trimmed = name.trim();
  const duplicate = existingNames.some(
    (n) => n.toLowerCase() === trimmed.toLowerCase(),
  );
  const valid = trimmed !== "" && !duplicate;

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid) return;
    onAdd({ name: trimmed, color });
    setName("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2.5">
        <ColorSwatch color={color} label="New tag color" onChange={setColor} />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New tag…"
          className="min-w-0 flex-1 rounded-[10px] border-[1.5px] border-line bg-panel px-3 py-2 text-[14px] font-semibold text-ink outline-none transition-[border-color,background] placeholder:text-faint focus:border-primary focus:bg-card"
        />
        <button
          type="submit"
          disabled={!valid}
          className="flex items-center gap-1 rounded-[10px] bg-primary px-3.5 py-2 font-display text-[13.5px] font-semibold text-white transition-colors hover:bg-primary-deep disabled:opacity-50"
        >
          <Icon name="add" size={16} />
          Add
        </button>
      </div>
      {duplicate && (
        <p className="m-0 pl-12 text-[12px] font-bold text-primary">
          “{trimmed}” already exists.
        </p>
      )}
    </form>
  );
}

function TagGroup({
  tags,
  onAdd,
  onUpdate,
  onDelete,
}: {
  tags: (TagOption & { id: string })[] | null;
  onAdd: (data: TagOption) => void;
  onUpdate: (id: string, data: Partial<TagOption>) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
    {tags === null ? (
      <CardSkeletons className="h-14" />
    ) : (
      tags.map((tag) => (
        <TagRow
          // Saved values are the row's initial state; keying on them remounts
          // the row when a change lands (own commit, another tab, the seed).
          key={`${tag.id}:${tag.name}:${tag.color}`}
          tag={tag}
          onUpdate={(data) => onUpdate(tag.id, data)}
          onDelete={() => onDelete(tag.id)}
        />
      ))
    )}
      <AddTagForm
        existingNames={(tags ?? []).map((t) => t.name)}
        onAdd={onAdd}
      />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="m-0 mb-4 font-display text-[15.5px] font-semibold text-ink">
      {children}
    </h2>
  );
}

export default function TagsView() {
  const user = useUser();
  const todoTags = useTodoTags(user.uid);
  const financeTags = useFinanceTags(user.uid);

  // First visit: turn the built-in defaults into editable docs. Runs whenever
  // a collection is empty, so deleting every tag restores the defaults.
  const seededTodo = useRef(false);
  const seededFinance = useRef(false);
  useEffect(() => {
    if (todoTags?.length === 0 && !seededTodo.current) {
      seededTodo.current = true;
      seedDefaultTodoTags(user.uid);
    }
  }, [todoTags, user.uid]);
  useEffect(() => {
    if (financeTags?.length === 0 && !seededFinance.current) {
      seededFinance.current = true;
      seedDefaultFinanceTags(user.uid);
    }
  }, [financeTags, user.uid]);

  const nextTodoOrder =
    (todoTags ?? []).reduce((max, t) => Math.max(max, t.order), -1) + 1;
  const nextFinanceOrder =
    (financeTags ?? []).reduce((max, t) => Math.max(max, t.order), -1) + 1;

  const financeGroup = (type: TxType) =>
    financeTags === null
      ? null
      : financeTags.filter((t) => t.type === type);

  return (
    <div className="flex flex-1 flex-col">
      {/* Page toolbar */}
      <div className="flex flex-wrap items-center gap-4 px-4 pb-1 pt-[26px] sm:px-7">
        <div className="mr-1 flex flex-col gap-4 leading-[1.15]">
          <h1 className="m-0 font-display text-[26px] font-semibold text-ink">
            Tags
          </h1>
          <span className="text-[13.5px] font-semibold text-muted">
            Task tags and money categories — renaming or deleting one doesn’t
            change items already saved with it.
          </span>
        </div>
      </div>

      <div className="grid items-start gap-5 px-4 pb-[calc(env(safe-area-inset-bottom)+34px)] pt-[18px] sm:px-7 lg:grid-cols-2">
        <section className="rounded-[18px] border-[1.5px] border-line-soft bg-panel p-5">
          <SectionTitle>Todo tags</SectionTitle>
          <TagGroup
            tags={todoTags}
            onAdd={(data) => addTodoTag(user.uid, data, nextTodoOrder)}
            onUpdate={(id, data) => updateTag(user.uid, "todoTags", id, data)}
            onDelete={(id) => deleteTag(user.uid, "todoTags", id)}
          />
        </section>

        <section className="flex flex-col gap-7 rounded-[18px] border-[1.5px] border-line-soft bg-panel p-5">
          {(["expense", "income"] as const).map((type) => (
            <div key={type}>
              <SectionTitle>
                {type === "expense" ? "Spending categories" : "Income categories"}
              </SectionTitle>
              <TagGroup
                tags={financeGroup(type)}
                onAdd={(data) =>
                  addFinanceTag(user.uid, { ...data, type }, nextFinanceOrder)
                }
                onUpdate={(id, data) =>
                  updateTag(user.uid, "financeTags", id, data)
                }
                onDelete={(id) => deleteTag(user.uid, "financeTags", id)}
              />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
