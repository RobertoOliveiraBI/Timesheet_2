import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Send, ArrowLeft, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import type { TimeEntry } from "@shared/schema";

interface Comment {
  id: number;
  timeEntryId: number;
  userId: number;
  comment: string;
  commentType: "MANAGER_FEEDBACK" | "COLLABORATOR_RESPONSE";
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeEntry: TimeEntry & { user?: { name: string; role: string } };
  currentUserId: number;
  currentUserRole: string;
}

export function CommentModal({ 
  isOpen, 
  onClose, 
  timeEntry, 
  currentUserId, 
  currentUserRole 
}: CommentModalProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch comments using credentials
  const { data: comments = [], isLoading, refetch } = useQuery({
    queryKey: ['time-entry-comments', timeEntry.id],
    queryFn: async () => {
      const response = await fetch(`/api/time-entries/${timeEntry.id}/comments`, {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      return response.json();
    },
    enabled: isOpen && !!timeEntry.id,
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async (data: { comment: string; commentType: string }) => {
      const response = await fetch(`/api/time-entries/${timeEntry.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create comment');
      return response.json();
    },
    onSuccess: () => {
      refetch();
      setNewComment("");
      setIsSubmitting(false);
      queryClient.invalidateQueries({ queryKey: ['timesheet'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
    onError: () => {
      setIsSubmitting(false);
    },
  });

  // Respond to comment mutation (for collaborators)
  const respondCommentMutation = useMutation({
    mutationFn: async (comment: string) => {
      const response = await fetch(`/api/time-entries/${timeEntry.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: "include",
        body: JSON.stringify({ comment }),
      });
      if (!response.ok) throw new Error('Failed to respond to comment');
      return response.json();
    },
    onSuccess: () => {
      refetch();
      setNewComment("");
      setIsSubmitting(false);
      queryClient.invalidateQueries({ queryKey: ['timesheet'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      onClose(); // Fechar modal após resposta
    },
    onError: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);

    const isManager = ['MASTER', 'ADMIN', 'GESTOR'].includes(currentUserRole);
    const isOwner = Number(timeEntry.userId) === Number(currentUserId);

    if (isManager) {
      // Manager adding feedback
      createCommentMutation.mutate({
        comment: newComment,
        commentType: "MANAGER_FEEDBACK"
      });
    } else if (isOwner) {
      // Collaborator adding comment/response
      createCommentMutation.mutate({
        comment: newComment,
        commentType: "COLLABORATOR_RESPONSE"
      });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      // Garantir que a data seja interpretada como UTC do servidor (São Paulo)
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (error) {
      return dateString;
    }
  };

  const getCommentTypeLabel = (type: string) => {
    return type === "MANAGER_FEEDBACK" ? "Feedback do Gestor" : "Resposta do Colaborador";
  };

  const getCommentTypeBadge = (type: string) => {
    return type === "MANAGER_FEEDBACK" 
      ? <Badge variant="secondary" className="text-xs">Gestor</Badge>
      : <Badge variant="outline" className="text-xs">Colaborador</Badge>;
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const canAddComment = () => {
    const isManager = ['MASTER', 'ADMIN', 'GESTOR'].includes(currentUserRole);
    const isOwner = Number(timeEntry.userId) === Number(currentUserId);
    console.log('Debug canAddComment:', {
      currentUserRole,
      currentUserId,
      timeEntryUserId: timeEntry.userId,
      isManager,
      isOwner,
      canAdd: isManager || isOwner
    });
    return isManager || isOwner;
  };

  const getSubmitButtonText = () => {
    const isManager = ['MASTER', 'ADMIN', 'GESTOR'].includes(currentUserRole);
    const isOwner = Number(timeEntry.userId) === Number(currentUserId);
    
    if (isManager) {
      return "Enviar Feedback";
    } else if (isOwner) {
      return "Adicionar Comentário";
    }
    return "Enviar";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Comentários da Entrada
          </DialogTitle>
          <DialogDescription>
            {timeEntry.user?.name} - {format(new Date(timeEntry.date + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })} - {timeEntry.hours}h
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Comments List */}
          {isLoading ? (
            <div className="text-center py-4">Carregando comentários...</div>
          ) : !Array.isArray(comments) || comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum comentário ainda</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(comments as Comment[]).map((comment: Comment) => (
                <Card key={comment.id} className="border-l-4 border-l-primary/20">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getUserInitials(comment.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{comment.user.name}</span>
                          {getCommentTypeBadge(comment.commentType)}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDate(comment.createdAt)}
                          </div>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Add Comment Form - Always visible for debugging */}
          <div className="border-t pt-4 space-y-3">
            {/* Debug info */}
            <div className="text-xs text-gray-500 p-2 bg-gray-100 rounded">
              Debug: canAddComment = {canAddComment().toString()}, 
              role: {currentUserRole}, 
              userId: {currentUserId} (type: {typeof currentUserId}), 
              entryUserId: {timeEntry.userId} (type: {typeof timeEntry.userId}),
              Number(userId): {Number(currentUserId)},
              Number(entryUserId): {Number(timeEntry.userId)},
              isOwner: {(Number(timeEntry.userId) === Number(currentUserId)).toString()}
            </div>
            
            {canAddComment() ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {['MASTER', 'ADMIN', 'GESTOR'].includes(currentUserRole) ? 'Adicionar Feedback' : 'Adicionar Comentário'}
                  </label>
                  <Textarea
                    placeholder={['MASTER', 'ADMIN', 'GESTOR'].includes(currentUserRole) 
                      ? "Digite seu feedback para o colaborador..." 
                      : "Digite seu comentário..."
                    }
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[100px] resize-none"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Fechar
                  </Button>
                  <Button 
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSubmitting ? "Enviando..." : getSubmitButtonText()}
                  </Button>
                </div>
                {Number(timeEntry.userId) === Number(currentUserId) && (
                  <p className="text-xs text-muted-foreground">
                    💡 Ao responder, a entrada voltará para status "Rascunho" permitindo edição
                  </p>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-red-500">
                Você não tem permissão para adicionar comentários.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}