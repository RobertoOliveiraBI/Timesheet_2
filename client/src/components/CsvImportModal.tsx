import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Download, CheckCircle, XCircle, AlertCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ImportResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  rowNumber?: number;
}

interface ImportSummary {
  success: number;
  errors: number;
  total: number;
}

interface Template {
  entityType: string;
  filename: string;
  description: string;
  downloadUrl: string;
}

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEntity: string;
  entityName: string;
}

export function CsvImportModal({ isOpen, onClose, selectedEntity, entityName }: CsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione um arquivo CSV",
          variant: "destructive"
        });
        return;
      }
      setFile(selectedFile);
      setResults([]);
      setSummary(null);
    }
  };

  const downloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      const response = await fetch(`/api/csv-import/template/${selectedEntity}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Erro ao baixar template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template_${selectedEntity}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Template baixado",
        description: "Template CSV baixado com sucesso"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao baixar template CSV",
        variant: "destructive"
      });
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "Arquivo necessário",
        description: "Por favor, selecione um arquivo CSV",
        variant: "destructive"
      });
      return;
    }

    try {
      setImporting(true);
      setProgress(20);

      const formData = new FormData();
      formData.append('csvFile', file);

      setProgress(50);

      const response = await fetch(`/api/csv-import/${selectedEntity}`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      setProgress(80);

      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        setSummary(data.summary || { success: 0, errors: 0, total: 0 });
        
        toast({
          title: "Importação concluída",
          description: data.message || "Dados importados com sucesso"
        });
      } else {
        const errorData = await response.json();
        setResults(errorData.results || []);
        setSummary(errorData.summary || { success: 0, errors: 0, total: 0 });
        
        toast({
          title: "Erro na importação",
          description: errorData.message || "Erro ao importar dados",
          variant: "destructive"
        });
      }

      setProgress(100);
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Erro",
        description: "Erro interno durante a importação",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const resetForm = () => {
    setFile(null);
    setResults([]);
    setSummary(null);
    setProgress(0);
  };

  const successResults = results.filter(r => r.success);
  const errorResults = results.filter(r => !r.success);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar {entityName} via CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                1. Baixar Template
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Baixe o template CSV com os campos obrigatórios para {entityName.toLowerCase()}
              </p>
              <Button
                onClick={downloadTemplate}
                disabled={downloadingTemplate}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                {downloadingTemplate ? "Baixando..." : "Baixar Template CSV"}
              </Button>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Upload className="h-4 w-4" />
                2. Selecionar Arquivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                {file && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Arquivo selecionado: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Import Button */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                3. Importar Dados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  onClick={handleImport}
                  disabled={!file || importing}
                  className="w-full sm:w-auto"
                >
                  {importing ? "Importando..." : "Iniciar Importação"}
                </Button>

                {importing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso da importação</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results Summary */}
          {summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Resultado da Importação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{summary.success}</div>
                    <div className="text-sm text-muted-foreground">Sucessos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{summary.errors}</div>
                    <div className="text-sm text-muted-foreground">Erros</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{summary.total}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Results */}
          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Detalhes dos Resultados</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {results.map((result, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 rounded border">
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant={result.success ? "default" : "destructive"} className="text-xs">
                              Linha {result.rowNumber || index + 1}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {result.success ? "Sucesso" : "Erro"}
                            </Badge>
                          </div>
                          <p className="text-sm mt-1 break-words">
                            {result.message || result.error}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={resetForm}
              disabled={importing}
            >
              Limpar
            </Button>
            <Button onClick={onClose} disabled={importing}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}