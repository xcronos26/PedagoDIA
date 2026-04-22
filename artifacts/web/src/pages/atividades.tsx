import React, { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useActivities, useCreateActivity, useUpdateActivity, useDeleteActivity, Activity } from "@/hooks/use-activities";
import { useStudents } from "@/hooks/use-students";
import { useDeliveries, useToggleDelivery } from "@/hooks/use-deliveries";
import { useSubjects } from "@/hooks/use-subjects";
import { ClassFilter } from "@/components/class-filter";
import { Plus, Book, FileText, Calendar as CalendarIcon, Link as LinkIcon, Trash2, Edit2, ChevronDown, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useToast } from "@/hooks/use-toast";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function ActivityCard({ activity, onEdit }: { activity: Activity; onEdit: (a: Activity) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [deliveryClass, setDeliveryClass] = useState<string | null>(null);
  const { data: students } = useStudents(deliveryClass);
  const { data: deliveries } = useDeliveries(activity.id);
  const { mutate: toggleDelivery } = useToggleDelivery();
  const { mutate: deleteActivity } = useDeleteActivity();
  const { toast } = useToast();

  const handleToggle = (studentId: string, currentDelivered: boolean) => {
    toggleDelivery({ activityId: activity.id, studentId, delivered: !currentDelivered });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Tem certeza que deseja excluir esta atividade? As entregas também serão apagadas.")) {
      deleteActivity(activity.id, {
        onSuccess: () => toast({ title: "Atividade excluída." })
      });
    }
  };

  const visibleStudentIds = new Set(students?.map(s => s.id) ?? []);
  const deliveredCount = deliveries?.filter(d => d.delivered && visibleStudentIds.has(d.studentId)).length || 0;
  const totalCount = students?.length || 0;
  const progress = totalCount === 0 ? 0 : (deliveredCount / totalCount) * 100;

  return (
    <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* Card Header (Clickable) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 cursor-pointer flex flex-col md:flex-row gap-4 md:items-center relative overflow-hidden"
      >
        {/* Progress Background */}
        <div 
          className="absolute bottom-0 left-0 h-1 bg-success/30 transition-all duration-500" 
          style={{ width: `${progress}%` }} 
        />
        <div 
          className="absolute bottom-0 left-0 h-1 bg-success transition-all duration-500" 
          style={{ width: `${progress}%` }} 
        />

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
              activity.type === 'homework' ? "bg-accent/20 text-accent-foreground" : "bg-primary/10 text-primary"
            )}>
              {activity.type === 'homework' ? 'Para Casa' : 'Em Sala'}
            </span>
            <div className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground">
              <CalendarIcon className="w-4 h-4" />
              {format(new Date(activity.date), "dd/MM/yyyy")}
            </div>
          </div>
          <h3 className="text-xl font-display font-bold text-foreground">{activity.subject}</h3>
          <p className="text-muted-foreground mt-1 line-clamp-2">{activity.description}</p>
        </div>

        <div className="flex items-center gap-6 justify-between md:justify-end">
          <div className="text-center bg-muted/20 px-4 py-2 rounded-xl border border-border/50">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Entregas</p>
            <p className="font-display font-bold text-lg text-foreground">
              {deliveredCount} <span className="text-muted-foreground text-sm">/ {totalCount}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {activity.link && (
              <a 
                href={activity.link} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="p-2 text-primary bg-primary/10 rounded-lg hover:bg-primary hover:text-white transition-colors"
                title="Acessar Link"
              >
                <LinkIcon className="w-5 h-5" />
              </a>
            )}
            <button 
              onClick={e => { e.stopPropagation(); onEdit(activity); }}
              className="p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
              title="Editar Atividade"
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <button 
              onClick={handleDelete}
              className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
              title="Excluir Atividade"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <div className={cn("p-2 text-muted-foreground transition-transform duration-300", isExpanded ? "rotate-180" : "")}>
              <ChevronDown className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <div className={cn(
        "grid transition-all duration-300 ease-in-out",
        isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}>
        <div className="overflow-hidden border-t border-border/30 bg-muted/5">
          {/* Activity Details */}
          <div className="p-4 border-b border-border/20 bg-card">
            <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Detalhes da Atividade
            </h4>
            
            {activity.description && (
              <div className="mb-3">
                <p className="text-sm font-bold text-muted-foreground mb-1">Descrição:</p>
                <p className="text-sm text-foreground bg-background p-3 rounded-lg border border-border/50">
                  {activity.description}
                </p>
              </div>
            )}
            
            {activity.link && (
              <div className="mb-3">
                <p className="text-sm font-bold text-muted-foreground mb-1">Link da atividade:</p>
                <div className="flex items-center gap-2">
                  <a 
                    href={activity.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 text-sm text-primary bg-primary/5 p-3 rounded-lg border border-primary/20 hover:bg-primary/10 transition-colors flex items-center gap-2 group"
                  >
                    <LinkIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{activity.link}</span>
                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      (abrir em nova aba)
                    </span>
                  </a>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <CalendarIcon className="w-4 h-4" />
                <span>{format(new Date(activity.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
              </div>
              <div className="flex items-center gap-1">
                <Book className="w-4 h-4" />
                <span>{activity.type === 'homework' ? 'Tarefa de casa' : 'Atividade em sala'}</span>
              </div>
            </div>
          </div>
          
          {/* Student List */}
          <div className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <h4 className="font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Entregas ({deliveredCount}/{totalCount})
              </h4>
              <ClassFilter value={deliveryClass} onChange={setDeliveryClass} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {students?.map(student => {
                const delivery = deliveries?.find(d => d.studentId === student.id);
                const isDelivered = delivery?.delivered === true;

                return (
                  <button
                    key={student.id}
                    onClick={() => handleToggle(student.id, isDelivered)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all text-left group",
                      isDelivered 
                        ? "bg-success/10 border-success/30 hover:border-success/50" 
                        : "bg-background border-border/50 hover:border-primary/50 hover:bg-card"
                    )}
                  >
                    <span className={cn(
                      "font-semibold truncate pr-3",
                      isDelivered ? "text-success-foreground" : "text-foreground group-hover:text-primary"
                    )}>
                      {student.name}
                    </span>
                    {isDelivered ? (
                      <CheckCircle2 className="w-6 h-6 text-success shrink-0" />
                    ) : (
                      <Circle className="w-6 h-6 text-muted-foreground/40 group-hover:text-primary/40 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type FormData = {
  subject: string;
  type: "homework" | "classwork";
  date: string;
  description: string;
  link: string;
};

const emptyForm: FormData = {
  subject: "",
  type: "classwork",
  date: format(new Date(), 'yyyy-MM-dd'),
  description: "",
  link: "",
};

export default function Atividades() {
  const { data: activities, isLoading } = useActivities();
  const { data: subjects } = useSubjects();
  const { mutate: createActivity, isPending: creating } = useCreateActivity();
  const { mutate: updateActivity, isPending: updating } = useUpdateActivity();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);

  const openCreate = () => {
    setEditingActivity(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setFormData({
      subject: activity.subject,
      type: activity.type,
      date: activity.date,
      description: activity.description,
      link: activity.link ?? "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingActivity(null);
    setFormData(emptyForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.description.trim()) return;

    const payload = {
      ...formData,
      subject: formData.subject.trim(),
      description: formData.description.trim(),
    };

    if (editingActivity) {
      updateActivity({ id: editingActivity.id, ...payload }, {
        onSuccess: () => {
          closeModal();
          toast({ title: "Atividade atualizada!" });
        },
      });
    } else {
      createActivity(payload, {
        onSuccess: () => {
          closeModal();
          toast({ title: "Atividade criada com sucesso!" });
        },
      });
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-foreground">Atividades</h1>
          <p className="text-muted-foreground mt-1">Gerencie tarefas e controle as entregas.</p>
        </div>

        <button 
          onClick={openCreate}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nova Atividade
        </button>
      </div>

      {/* List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-muted-foreground bg-card rounded-2xl border border-border/50">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p>Carregando atividades...</p>
          </div>
        ) : activities?.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center bg-card rounded-2xl border border-border/50">
            <div className="bg-primary/10 p-6 rounded-full text-primary mb-6">
              <Book className="w-16 h-16" />
            </div>
            <h3 className="text-2xl font-display font-bold text-foreground mb-2">Nenhuma atividade</h3>
            <p className="text-muted-foreground max-w-sm mb-6 text-lg">
              Crie a primeira atividade para começar a acompanhar as entregas dos alunos.
            </p>
            <button 
              onClick={openCreate}
              className="bg-primary text-primary-foreground px-8 py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:-translate-y-1 transition-all"
            >
              Criar Atividade
            </button>
          </div>
        ) : (
          activities?.map(act => (
            <ActivityCard key={act.id} activity={act} onEdit={openEdit} />
          ))
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border/50 shrink-0">
              <h2 className="text-2xl font-display font-bold text-foreground">
                {editingActivity ? "Editar Atividade" : "Nova Atividade"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground ml-1">Disciplina / Assunto</label>
                  {/* Combobox behavior using datalist */}
                  <input
                    type="text"
                    required
                    list="subjects-list"
                    value={formData.subject}
                    onChange={e => setFormData({...formData, subject: e.target.value})}
                    className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl focus:border-primary outline-none font-medium"
                    placeholder="Ex: Matemática"
                  />
                  <datalist id="subjects-list">
                    {subjects?.map(s => <option key={s.id} value={s.name} />)}
                  </datalist>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground ml-1">Data de Entrega</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl focus:border-primary outline-none font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground ml-1">Tipo</label>
                <div className="flex gap-4">
                  <label className="flex-1 cursor-pointer">
                    <input type="radio" className="peer sr-only" name="type" value="classwork" checked={formData.type === 'classwork'} onChange={() => setFormData({...formData, type: 'classwork'})} />
                    <div className="px-4 py-3 border-2 border-border rounded-xl text-center font-bold text-muted-foreground peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary transition-all">
                      Em Sala
                    </div>
                  </label>
                  <label className="flex-1 cursor-pointer">
                    <input type="radio" className="peer sr-only" name="type" value="homework" checked={formData.type === 'homework'} onChange={() => setFormData({...formData, type: 'homework'})} />
                    <div className="px-4 py-3 border-2 border-border rounded-xl text-center font-bold text-muted-foreground peer-checked:border-accent peer-checked:bg-accent/5 peer-checked:text-accent-foreground transition-all">
                      Para Casa
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground ml-1">Descrição</label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl focus:border-primary outline-none font-medium resize-none"
                  placeholder="Instruções da atividade..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground ml-1">Link (Opcional)</label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={e => setFormData({...formData, link: e.target.value})}
                  className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl focus:border-primary outline-none font-medium text-primary"
                  placeholder="https://..."
                />
              </div>

              <div className="pt-4 flex gap-3 justify-end shrink-0">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-3 rounded-xl font-bold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating || updating}
                  className="px-6 py-3 rounded-xl font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {(creating || updating) && <Loader2 className="w-5 h-5 animate-spin" />}
                  {editingActivity ? "Salvar Alterações" : "Salvar Atividade"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
