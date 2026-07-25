import React, { useState, useEffect, useRef } from 'react';
import { useTasks } from './context/TaskContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import PageHeader from '../../shared/components/PageHeader';
import TaskCard from './components/TaskCard';
import TaskModal from './components/TaskModal';
import CategoryModal from './components/CategoryModal';
import { Plus, MoreVertical, Pencil, Trash2, Settings, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function Tasks() {
    const { spaces, categories, tasks, moveTask, addCategory, updateCategory, deleteCategory, addSpace, updateSpace, deleteSpace } = useTasks();
    const { isDark } = useTheme();
    const { t } = useLanguage();
    const tabBg = isDark ? '#111' : '#f5f5f7';
    const tabBgAlpha = isDark ? '#111111cc' : '#f5f5f7cc';

    // Active space tab
    const [activeSpaceId, setActiveSpaceId] = useState(spaces[0]?.id || '');

    // Modal States
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [defaultTaskCategory, setDefaultTaskCategory] = useState(null);

    // Category context menu
    const [categoryMenuId, setCategoryMenuId] = useState(null);

    // Space management panel
    const [isSpaceManagerOpen, setIsSpaceManagerOpen] = useState(false);
    const [editingSpaceId, setEditingSpaceId] = useState(null);
    const [editingSpaceName, setEditingSpaceName] = useState('');

    // Filter categories by active space
    const activeCategories = categories.filter(c => c.space_id === activeSpaceId);
    const activeSpace = spaces.find(s => s.id === activeSpaceId);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !isTaskModalOpen && !isCategoryModalOpen) {
                e.preventDefault();
                setDefaultTaskCategory(activeCategories[0]?.id || null);
                setEditingTask(null);
                setIsTaskModalOpen(true);
            }
            if (e.key === 'Escape') {
                if (isTaskModalOpen) setIsTaskModalOpen(false);
                if (isCategoryModalOpen) setIsCategoryModalOpen(false);
                if (categoryMenuId) setCategoryMenuId(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isTaskModalOpen, isCategoryModalOpen, categoryMenuId, activeCategories]);

    // Drag and Drop Handlers
    const handleDragStart = (e, taskId) => {
        e.dataTransfer.setData('taskId', taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault(); 
        e.dataTransfer.dropEffect = 'move';
        e.currentTarget.classList.add('bg-white/5');
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('bg-white/5');
    };

    const handleDrop = (e, categoryId) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-white/5');
        const taskId = e.dataTransfer.getData('taskId');
        if (taskId) {
            moveTask(taskId, categoryId);
        }
    };

    // Open Modals
    const openNewTaskModal = (categoryId = null) => {
        const defaultCat = categoryId || activeCategories[0]?.id;
        setDefaultTaskCategory(defaultCat);
        setEditingTask(null);
        setIsTaskModalOpen(true);
    };

    const openEditTaskModal = (task) => {
        setEditingTask(task);
        setIsTaskModalOpen(true);
    };

    const openNewCategoryModal = () => {
        setEditingCategory(null);
        setIsCategoryModalOpen(true);
    };

    const openEditCategoryModal = (category) => {
        setEditingCategory(category);
        setIsCategoryModalOpen(true);
        setCategoryMenuId(null);
    };

    const handleDeleteCategory = (categoryId) => {
        const catTasks = tasks.filter(t => t.category_id === categoryId);
        toast.error('¿Estás seguro?', {
            description: catTasks.length > 0
                ? `Esta categoría tiene ${catTasks.length} tarea(s) que serán eliminadas.`
                : 'Esta acción no se puede deshacer.',
            action: {
                label: t('common.eliminar'),
                onClick: () => {
                    deleteCategory(categoryId);
                    toast.success('Categoría eliminada');
                },
            },
        });
        setCategoryMenuId(null);
    };

    // Space handlers
    const handleAddSpace = async () => {
        const newSpace = await addSpace('Nuevo Espacio', '#6366f1');
        setActiveSpaceId(newSpace.id);
        toast.success('Espacio creado');
    };

    const handleDeleteSpace = (spaceId) => {
        if (spaces.length <= 1) {
            toast.error('Debes mantener al menos un espacio');
            return;
        }
        const spaceCats = categories.filter(c => c.space_id === spaceId);
        const spaceTasks = tasks.filter(t => spaceCats.some(c => c.id === t.category_id));
        toast.error('¿Eliminar espacio?', {
            description: spaceTasks.length > 0
                ? `Este espacio tiene ${spaceTasks.length} tarea(s). Todas serán eliminadas.`
                : 'Esta acción no se puede deshacer.',
            action: {
                label: t('common.eliminar'),
                onClick: () => {
                    deleteSpace(spaceId);
                    if (activeSpaceId === spaceId) {
                        setActiveSpaceId(spaces.find(s => s.id !== spaceId)?.id || '');
                    }
                    toast.success('Espacio eliminado');
                },
            },
        });
    };

    // Count tasks per space
    const getSpaceTaskCount = (spaceId) => {
        const spaceCats = categories.filter(c => c.space_id === spaceId);
        return tasks.filter(t => spaceCats.some(c => c.id === t.category_id)).length;
    };

    // Slider horizontal del tablero (columnas)
    const boardRef = useRef(null);
    const scrollBoard = (delta) => boardRef.current?.scrollBy({ left: delta, behavior: 'smooth' });

    return (
        <div className="flex flex-col h-full min-w-0">
            <style>{`
                .space-tab-active {
                    position: relative;
                    z-index: 20;
                }
                .space-tab-active::before,
                .space-tab-active::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    width: 12px;
                    height: 12px;
                    pointer-events: none;
                }
                .space-tab-active::before {
                    left: -12px;
                    background: radial-gradient(circle at 0 0, transparent 12px, ${tabBg} 12px);
                }
                .space-tab-active::after {
                    right: -12px;
                    background: radial-gradient(circle at 100% 0, transparent 12px, ${tabBg} 12px);
                }
            `}</style>

            {/* Title + acciones alineadas (consistente con las otras páginas) */}
            <div className="shrink-0 mb-5">
                <PageHeader
                    title={t('app.tareas')}
                    subtitle="Mantén el control de tus actividades."
                    right={
                        <div className="flex items-center gap-3">
                            <button
                                onClick={openNewCategoryModal}
                                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-bold tracking-wide text-xs hover:bg-white/10 transition-colors whitespace-nowrap"
                            >
                                + COLUMNA
                            </button>
                            <button onClick={() => openNewTaskModal()} className="btn-primary whitespace-nowrap">
                                + TAREA
                            </button>
                        </div>
                    }
                />
            </div>

            {/* ── Top Row: Tabs + Actions ── */}
            <div className="shrink-0 flex items-end justify-between gap-4 mb-0">
                {/* Space Tabs */}
                <div className="flex items-end gap-1 overflow-x-auto custom-scrollbar pb-0 relative z-10 flex-1 min-w-0">
                    {spaces.map(space => {
                        const isActive = space.id === activeSpaceId;
                        const taskCount = getSpaceTaskCount(space.id);

                        return (
                            <div
                                key={space.id}
                                className={`
                                    group relative flex items-center gap-2.5 cursor-pointer transition-all duration-300 select-none shrink-0
                                    ${isActive 
                                        ? 'space-tab-active px-5 py-3 rounded-t-2xl' 
                                        : 'px-4 py-2.5 rounded-xl mb-1 hover:scale-[1.02]'
                                    }
                                `}
                                style={isActive ? {
                                    background: `linear-gradient(135deg, ${space.color}45 0%, ${space.color}18 50%, ${tabBgAlpha} 100%)`,
                                    backgroundColor: tabBg,
                                    border: `1px solid ${space.color}50`,
                                    borderBottom: 'none',
                                    boxShadow: `0 -6px 25px ${space.color}25, inset 0 1px 0 ${space.color}40, 0 0 40px ${space.color}08`
                                } : {
                                    background: `linear-gradient(135deg, ${space.color}10 0%, transparent 100%)`,
                                    border: '1px solid transparent'
                                }}
                                onClick={() => setActiveSpaceId(space.id)}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 rounded-t-2xl bg-noise opacity-10 pointer-events-none" />
                                )}

                                <div 
                                    className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all duration-300 ${isActive ? 'scale-110' : ''}`}
                                    style={{ 
                                        backgroundColor: space.color, 
                                        boxShadow: isActive ? `0 0 12px ${space.color}80, 0 0 4px ${space.color}` : `0 0 4px ${space.color}40` 
                                    }}
                                />

                                <span className={`text-xs font-bold tracking-wide relative z-10 transition-colors duration-300 ${isActive ? 'text-white' : 'text-white/40 group-hover:text-white/70'}`}>
                                    {space.name}
                                </span>

                                {taskCount > 0 && (
                                    <span 
                                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md relative z-10 transition-all duration-300 ${isActive ? 'text-white/70' : 'text-white/25'}`}
                                        style={isActive ? { backgroundColor: `${space.color}20` } : { backgroundColor: 'rgba(255,255,255,0.03)' }}
                                    >
                                        {taskCount}
                                    </span>
                                )}
                            </div>
                        );
                    })}

                    {/* Add space + Manage spaces */}
                    <div className="flex items-center gap-1 mb-1 shrink-0">
                        <button
                            onClick={handleAddSpace}
                            className="flex items-center justify-center w-8 h-8 rounded-xl text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-all"
                            title="Agregar espacio"
                        >
                            <Plus size={16} />
                        </button>
                        <button
                            onClick={() => setIsSpaceManagerOpen(true)}
                            className="flex items-center justify-center w-8 h-8 rounded-xl text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-all"
                            title="Administrar espacios"
                        >
                            <Settings size={15} />
                        </button>
                    </div>
                </div>

                {/* Slider del tablero (para navegar columnas si hay más de las visibles) */}
                {activeCategories.length > 0 && (
                    <div className="flex items-center gap-2 shrink-0 mb-3">
                        <span className="text-text-muted/60 text-[11px] font-semibold tracking-wide mr-1 hidden sm:inline">Desliza para ver columnas</span>
                        <button onClick={() => scrollBoard(-340)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-colors" title="Columnas anteriores">
                            <ChevronLeft size={15} />
                        </button>
                        <button onClick={() => scrollBoard(340)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-colors" title="Columnas siguientes">
                            <ChevronRight size={15} />
                        </button>
                    </div>
                )}
            </div>

            {/* Seamless bottom border */}
            <div className="w-full h-[1px] bg-white/10 relative z-0 shrink-0 mt-1" />

            {/* ── Kanban Board Area ── */}
            <div ref={boardRef} className="flex-1 min-w-0 overflow-x-auto overflow-y-auto custom-scrollbar pt-6 pb-4 flex gap-5">
                {activeCategories.map(category => {
                    const categoryTasks = tasks.filter(t => t.category_id === category.id);
                    
                    return (
                        <div 
                            key={category.id} 
                            className="w-[300px] shrink-0 flex flex-col gap-4 rounded-3xl transition-colors duration-300"
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, category.id)}
                        >
                            {/* Category Header */}
                            <div className={`flex items-center gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl shrink-0 backdrop-blur-md relative ${categoryMenuId === category.id ? 'z-50' : 'z-10'}`}>
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color, boxShadow: `0 0 8px ${category.color}60` }}></div>
                                <h3 className="text-white font-bold text-sm tracking-wide">{category.name}</h3>
                                <span className="bg-black/50 text-white/50 text-xs px-2 py-1 rounded-lg ml-auto font-bold">{categoryTasks.length}</span>
                                
                                <button 
                                    onClick={() => openNewTaskModal(category.id)}
                                    className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors"
                                    title="Añadir tarea aquí"
                                >
                                    <Plus size={16} />
                                </button>

                                <button 
                                    onClick={() => setCategoryMenuId(categoryMenuId === category.id ? null : category.id)}
                                    className="p-1.5 hover:bg-white/10 rounded-lg text-white/30 hover:text-white transition-colors"
                                    title="Opciones de columna"
                                >
                                    <MoreVertical size={16} />
                                </button>

                                {categoryMenuId === category.id && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setCategoryMenuId(null)} />
                                        <div className="absolute top-full right-0 mt-2 z-50 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[180px]">
                                            <button 
                                                onClick={() => openEditCategoryModal(category)}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors"
                                            >
                                                <Pencil size={14} />
                                                Editar columna
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteCategory(category.id)}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                                Eliminar columna
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                            
                            {/* Task List */}
                            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar pb-4 min-h-[80px]">
                                {categoryTasks.length === 0 ? (
                                    <div className="border border-dashed border-white/10 rounded-2xl h-24 flex items-center justify-center text-white/20 text-xs font-bold uppercase tracking-wider">
                                        Soltar aquí
                                    </div>
                                ) : (
                                    categoryTasks.map(task => (
                                        <TaskCard 
                                            key={task.id} 
                                            task={task} 
                                            categoryColor={category.color} 
                                            onEdit={openEditTaskModal}
                                            onDragStart={handleDragStart}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Add Column Placeholder */}
                <button 
                    onClick={openNewCategoryModal}
                    className="w-[300px] shrink-0 border border-dashed border-white/10 hover:border-white/20 hover:bg-white/[0.02] rounded-3xl flex flex-col items-center justify-center gap-3 text-white/30 hover:text-white/60 transition-all min-h-[200px]"
                >
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                        <Plus size={24} />
                    </div>
                    <span className="font-bold text-sm tracking-wider uppercase">Nueva Columna</span>
                </button>
            </div>

            {/* ── Space Manager Modal ── */}
            {isSpaceManagerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl relative">
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <div>
                                <h2 className="text-xl font-bold text-white">Administrar Espacios</h2>
                                <p className="text-text-muted text-xs mt-1">Crea, edita o elimina tus espacios de trabajo.</p>
                            </div>
                            <button onClick={() => { setIsSpaceManagerOpen(false); setEditingSpaceId(null); }} className="p-2 text-white/50 hover:text-white transition-colors hover:bg-white/5 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {spaces.map(space => {
                                const taskCount = getSpaceTaskCount(space.id);
                                const isEditing = editingSpaceId === space.id;

                                return (
                                    <div key={space.id} className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/5 rounded-xl group hover:border-white/10 transition-colors">
                                        {/* Color dot (clickable to change color) */}
                                        <div className="relative shrink-0">
                                            <div 
                                                className="w-5 h-5 rounded-full border-2 border-white/20 cursor-pointer hover:scale-110 transition-transform"
                                                style={{ backgroundColor: space.color }}
                                            />
                                            <input
                                                type="color"
                                                value={space.color}
                                                onChange={(e) => updateSpace(space.id, { color: e.target.value })}
                                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                            />
                                        </div>

                                        {/* Name (inline edit) */}
                                        {isEditing ? (
                                            <div className="flex items-center gap-2 flex-1">
                                                <input
                                                    type="text"
                                                    value={editingSpaceName}
                                                    onChange={(e) => setEditingSpaceName(e.target.value)}
                                                    onKeyDown={(e) => { 
                                                        if (e.key === 'Enter') { updateSpace(space.id, { name: editingSpaceName.trim() || space.name }); setEditingSpaceId(null); }
                                                        if (e.key === 'Escape') setEditingSpaceId(null);
                                                    }}
                                                    className="flex-1 bg-white/5 border border-acid/50 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                                                    autoFocus
                                                />
                                                <button 
                                                    onClick={() => { updateSpace(space.id, { name: editingSpaceName.trim() || space.name }); setEditingSpaceId(null); toast.success('Espacio renombrado'); }}
                                                    className="p-1.5 bg-acid/10 text-acid rounded-lg hover:bg-acid/20 transition-colors"
                                                >
                                                    <Check size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-bold text-white">{space.name}</span>
                                                <span className="text-xs text-white/30 ml-2">{taskCount} tarea{taskCount !== 1 ? 's' : ''}</span>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        {!isEditing && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => { setEditingSpaceId(space.id); setEditingSpaceName(space.name); }}
                                                    className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                                    title="Renombrar"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteSpace(space.id)}
                                                    className="p-2 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Eliminar espacio"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-6 border-t border-white/5">
                            <button 
                                onClick={async () => { const ns = await addSpace('Nuevo Espacio', '#6366f1'); setEditingSpaceId(ns.id); setEditingSpaceName('Nuevo Espacio'); }}
                                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-white/10 hover:border-white/20 rounded-xl text-white/50 hover:text-white/80 hover:bg-white/[0.02] transition-all text-sm font-bold"
                            >
                                <Plus size={16} />
                                Crear nuevo espacio
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            <TaskModal 
                isOpen={isTaskModalOpen} 
                onClose={() => setIsTaskModalOpen(false)} 
                initialData={editingTask} 
                defaultCategoryId={defaultTaskCategory}
            />

            <CategoryModal 
                isOpen={isCategoryModalOpen} 
                onClose={() => setIsCategoryModalOpen(false)} 
                initialData={editingCategory} 
                onSave={(name, color) => {
                    if (editingCategory) {
                        updateCategory(editingCategory.id, { name, color });
                        toast.success('Categoría actualizada');
                    } else {
                        addCategory(name, color, activeSpaceId);
                        toast.success('Categoría creada');
                    }
                }}
            />
        </div>
    );
}
