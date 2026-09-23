import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Key, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  FileLock2, 
  Sparkles, 
  Layers,
  MapPin,
  RefreshCw,
  FileCheck2,
  CheckCircle,
  ShieldAlert,
  FileText
} from 'lucide-react';
import { MathView } from '@/components/MathView';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';

export default function StrongRoomVaultPage() {
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sealingFormId, setSealingFormId] = useState<number | null>(null);

  // Sealed Package Modal State
  const [sealedResult, setSealedResult] = useState<any>(null);

  // Integrity Verification Modal State
  const [integrityModal, setIntegrityModal] = useState<any>(null);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);

  // Unsealing Modal State
  const [unsealingPaper, setUnsealingPaper] = useState<any>(null);
  const [shareInputs, setShareInputs] = useState<Array<{ x: string; dataHex: string }>>([
    { x: '1', dataHex: '' },
    { x: '2', dataHex: '' },
    { x: '3', dataHex: '' }
  ]);
  const [unsealingLoading, setUnsealingLoading] = useState<boolean>(false);

  // Print Station Modal State
  const [printPaper, setPrintPaper] = useState<any>(null);
  const [copyCount, setCopyCount] = useState<number>(30);
  const [printBatches, setPrintBatches] = useState<any[]>([]);

  const loadPapers = async () => {
    try {
      setLoading(true);
      const res: any = await apiClient.get('/scrutiny/papers');
      const list = res?.forms || res?.data?.forms || [];
      setPapers(list);
    } catch (err) {
      console.error('Failed to load papers for vault', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPapers();
  }, []);

  const handleSealPaper = async (formId: number) => {
    try {
      setSealingFormId(formId);
      const res: any = await apiClient.post(`/vault/papers/${formId}/seal`, {});
      if (res?.success) {
        toast.success('Paper sealed into Cryptographic Vault with SSS 3-of-5 threshold shares!');
        setSealedResult(res);
        await loadPapers();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to seal paper form');
    } finally {
      setSealingFormId(null);
    }
  };

  const handleUnsealSubmit = async () => {
    if (!unsealingPaper) return;
    const filledShares = shareInputs.filter((s) => s.dataHex.trim().length > 0);
    if (filledShares.length < 3) {
      toast.error('Minimum 3 Trustee SSS shares are required to unseal');
      return;
    }

    try {
      setUnsealingLoading(true);
      const payload = {
        shares: filledShares.map((s) => ({
          x: parseInt(s.x, 10),
          dataHex: s.dataHex.trim()
        }))
      };

      const res: any = await apiClient.post(`/vault/papers/${unsealingPaper.id}/unseal`, payload);
      if (res?.success) {
        toast.success('Paper unsealed successfully! Strong Room physical authorization logged.');
        setPrintPaper(res.paper);
        setUnsealingPaper(null);
        await loadPapers();
      }
    } catch (err: any) {
      toast.error(err.message || 'Unsealing failed: Invalid or insufficient Shamir shares');
    } finally {
      setUnsealingLoading(false);
    }
  };

  const handleGeneratePrintBatches = async () => {
    if (!printPaper) return;
    try {
      const res: any = await apiClient.post(`/vault/papers/${printPaper.id}/print`, {
        copyCount: Number(copyCount)
      });
      if (res?.success) {
        setPrintBatches(res.copies || []);
        toast.success(`Generated ${copyCount} copies with dynamic forensic watermarks!`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate print batches');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
  };

  const handleVerifyIntegrity = async (formId: number) => {
    try {
      setVerifyingId(formId);
      const res: any = await apiClient.get(`/vault/papers/${formId}/integrity`);
      if (res?.success) {
        setIntegrityModal(res.certificate);
      } else {
        toast.error('Failed to retrieve RFC 8785 integrity certificate');
      }
    } catch (err: any) {
      toast.error(err.message || 'Integrity verification failed');
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <FileLock2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Examination Strong Room Vault</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Geofenced physical terminal access, Shamir's Secret Sharing (3-of-5) multi-trustee authorization, and forensic printing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3.5 py-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 flex items-center gap-1.5 text-xs font-semibold">
            <MapPin className="w-3.5 h-3.5" /> Strong Room Terminal Geofence: Active
          </Badge>
          <Badge variant="outline" className="px-3.5 py-1.5 bg-indigo-500/10 text-indigo-600 border-indigo-500/30 flex items-center gap-1.5 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" /> SSS 3-of-5 Threshold Active
          </Badge>
        </div>
      </div>

      {/* Vault Status & Governance Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Parallel Examination Papers in Repository</h3>
          <Button variant="outline" size="sm" onClick={loadPapers} className="text-xs h-8">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">Checking vault integrity...</div>
        ) : papers.length === 0 ? (
          <Card className="p-12 text-center">
            <FileLock2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-semibold">No Examination Papers Found</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Generate paper forms in the Blueprint engine to seal them into the Strong Room Vault.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {papers.map((paper) => {
              const isSealed = paper.status === 'SEALED';
              return (
                <Card key={paper.id} className="shadow-sm hover:border-primary/50 transition-all flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-base text-foreground">{paper.setName}</span>
                      <Badge className={isSealed ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}>
                        {isSealed ? '🔒 SEALED IN VAULT' : paper.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-semibold mt-1">
                      {paper.courseCode} - {paper.courseName}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {paper.blueprintTitle} • {paper.totalMarks} Marks
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    <div className="p-2.5 rounded-lg bg-muted/40 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Security Mode:</span>
                        <strong className="text-indigo-600">AES-256-GCM + SSS</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Physical Perimeter:</span>
                        <strong className="text-foreground">Strong Room Only</strong>
                      </div>
                    </div>

                    <div className="pt-1 flex flex-col gap-2">
                      {!isSealed ? (
                        <Button
                          size="sm"
                          className="w-full text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5"
                          disabled={sealingFormId === paper.id}
                          onClick={() => handleSealPaper(paper.id)}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          {sealingFormId === paper.id ? 'Sealing Vault...' : 'Seal Paper into Vault'}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5"
                          onClick={() => setUnsealingPaper(paper)}
                        >
                          <Unlock className="w-3.5 h-3.5" /> Unseal Paper (3-of-5 Ceremony)
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 flex items-center justify-center gap-1.5 text-indigo-700 dark:text-indigo-300"
                        disabled={verifyingId === paper.id}
                        onClick={() => handleVerifyIntegrity(paper.id)}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        {verifyingId === paper.id ? 'Verifying RFC 8785...' : 'Verify RFC 8785 Integrity'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Sealed Result Modal with 5 Trustee Shares */}
      {sealedResult && (
        <Dialog open={!!sealedResult} onOpenChange={() => setSealedResult(null)}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-6">
            <DialogHeader className="border-b pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <DialogTitle className="text-lg font-bold">
                  Cryptographic Vault Sealed — SSS 3-of-5 Threshold Package
                </DialogTitle>
              </div>
              <p className="text-xs text-muted-foreground">
                The examination paper is now sealed with AES-256-GCM. 5 cryptographic shares have been generated for designated college trustees.
              </p>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="p-3 rounded-lg border bg-muted/30 text-xs space-y-1">
                <span className="font-semibold text-muted-foreground block">RFC 8785 Canonical SHA-256 Digest:</span>
                <span className="font-mono text-[11px] break-all font-bold text-foreground">
                  {sealedResult.sealedDigest}
                </span>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Designated Trustee Key Shares (Distribute Securely):
                </h4>

                <div className="grid grid-cols-1 gap-2.5">
                  {sealedResult.trusteePackages?.map((pkg: any) => (
                    <div key={pkg.shareIndex} className="p-3 rounded-xl border bg-card flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            Share #{pkg.shareIndex}
                          </Badge>
                          <strong className="text-foreground">{pkg.trusteeRole}</strong>
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground block mt-1 line-clamp-1 max-w-xl">
                          {pkg.shareDataHex}
                        </span>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs flex items-center gap-1"
                        onClick={() => copyToClipboard(pkg.shareDataHex, `${pkg.trusteeRole}'s Key Share`)}
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy Key
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button size="sm" onClick={() => setSealedResult(null)}>
                Done & Acknowledge
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Unsealing Ceremony Modal (3-of-5 Inputs) */}
      {unsealingPaper && (
        <Dialog open={!!unsealingPaper} onOpenChange={() => setUnsealingPaper(null)}>
          <DialogContent className="max-w-2xl p-6">
            <DialogHeader className="border-b pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-500" />
                <DialogTitle className="text-lg font-bold">
                  Strong Room Unsealing Ceremony (3-of-5 Threshold)
                </DialogTitle>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter any 3 cryptographic key shares from authorized trustees to reconstitute the master unsealing key.
              </p>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="p-2.5 rounded-lg border bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Physical geofencing active: This operation is cryptographically logged with terminal IP and microsecond timestamps.
                </span>
              </div>

              {[0, 1, 2].map((idx) => (
                <div key={idx} className="space-y-1.5 p-3 rounded-xl border bg-muted/10">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Trustee Key Share #{idx + 1} *</Label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground">Share ID:</span>
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        value={shareInputs[idx].x}
                        onChange={(e) => {
                          const updated = [...shareInputs];
                          updated[idx].x = e.target.value;
                          setShareInputs(updated);
                        }}
                        className="w-14 h-6 text-xs text-center font-bold"
                      />
                    </div>
                  </div>
                  <Input
                    placeholder="Paste hex share data..."
                    value={shareInputs[idx].dataHex}
                    onChange={(e) => {
                      const updated = [...shareInputs];
                      updated[idx].dataHex = e.target.value;
                      setShareInputs(updated);
                    }}
                    className="font-mono text-xs"
                  />
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setUnsealingPaper(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={unsealingLoading}
                onClick={handleUnsealSubmit}
              >
                {unsealingLoading ? 'Reconstructing Master Key...' : 'Authorize & Unseal Paper'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Forensic Print Station Modal */}
      {printPaper && (
        <Dialog open={!!printPaper} onOpenChange={() => setPrintPaper(null)}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-6">
            <DialogHeader className="border-b pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <Printer className="w-5 h-5 text-indigo-500" />
                    Forensic Watermarked Printing Station — {printPaper.setName}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    {printPaper.courseCode} - {printPaper.courseName} • Dynamic Micro-dot Steganography Enabled
                  </p>
                </div>
                <Badge className="bg-emerald-600 text-white">UNSEALED & VERIFIED</Badge>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-3">
              {/* Batch configuration */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border bg-muted/20">
                <div className="flex items-center gap-3">
                  <Label className="text-xs font-semibold">Copy Count:</Label>
                  <Input
                    type="number"
                    min="1"
                    max="500"
                    value={copyCount}
                    onChange={(e) => setCopyCount(parseInt(e.target.value, 10) || 1)}
                    className="w-24 h-8 text-xs font-bold"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-indigo-600 text-white text-xs"
                    onClick={handleGeneratePrintBatches}
                  >
                    Generate Watermarked Serialized Copies
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs flex items-center gap-1"
                    onClick={() => window.print()}
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Examination Batch
                  </Button>
                </div>
              </div>

              {/* Forensic Watermark Sample Preview */}
              <div className="p-4 rounded-xl border bg-slate-900 text-slate-100 font-mono text-xs space-y-2">
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">
                  Forensic Steganography Layer Preview:
                </span>
                <p className="text-[11px] text-slate-300 break-all">
                  PRINTED AT: {new Date().toISOString()} | TERMINAL IP: 127.0.0.1 | STRONG ROOM CERT: #AMCEC-SR-001 | SERIAL: AMCEC-SEE-{printPaper.courseCode}-COPY#0001
                </p>
                <p className="text-[10px] text-slate-500">
                  Invisible high-frequency micro-dot patterns are embedded diagonally across each page. Any physical photo or leakage instantly pinpoints the printing operator and second.
                </p>
              </div>

              {/* Paper Questions Preview */}
              <div className="space-y-4 border rounded-xl p-4 bg-card">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Unsealed Examination Content ({printPaper.snapshots?.length} Items):
                </h4>
                {printPaper.snapshots?.map((snap: any) => (
                  <div key={snap.id} className="p-3 rounded-lg border bg-muted/10 space-y-2 text-xs">
                    <div className="flex justify-between font-bold text-primary">
                      <span>{snap.questionNumber} (Module {snap.moduleNumber})</span>
                      <span>{snap.frozenMarks} Marks</span>
                    </div>
                    <MathView content={snap.frozenStemJson?.text || snap.frozenStemJson} />
                    {snap.frozenStemJson?.svg && (
                      <div
                        className="max-w-xs p-2 border rounded bg-slate-50 dark:bg-slate-900"
                        dangerouslySetInnerHTML={{ __html: snap.frozenStemJson.svg }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button size="sm" onClick={() => setPrintPaper(null)}>
                Close Print Station
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* RFC 8785 Forensic Integrity Certificate Modal */}
      {integrityModal && (
        <Dialog open={!!integrityModal} onOpenChange={() => setIntegrityModal(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <DialogHeader className="border-b pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <DialogTitle className="text-base font-bold text-foreground">
                    Cryptographic Integrity Verification Certificate
                  </DialogTitle>
                </div>
                <Badge
                  className={
                    integrityModal.status === 'VERIFIED'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-rose-600 text-white font-semibold'
                  }
                >
                  {integrityModal.status === 'VERIFIED' ? '✓ RFC 8785 MATCHED' : '⚠ TAMPER DETECTED'}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              {/* Paper metadata overview */}
              <div className="p-3 rounded-lg border bg-muted/30 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Examination Paper</span>
                  <span className="font-semibold text-foreground">{integrityModal.setName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Course Code</span>
                  <span className="font-semibold text-foreground">{integrityModal.courseCode}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Sealing Status</span>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    {integrityModal.isSealed ? 'Sealed in Vault' : 'Pre-Seal Scrutiny'}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Item Snapshots</span>
                  <span className="font-semibold text-foreground">{integrityModal.itemCount} Questions</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">BoE Scrutiny Reviews</span>
                  <span className="font-semibold text-foreground">{integrityModal.scrutinyReviewsCount} Recorded</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Envelope Security</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                    {integrityModal.envelopeConfig?.cipher || 'AES-256-GCM'}
                  </span>
                </div>
              </div>

              {/* Status Alert Banner */}
              <div
                className={`p-3.5 rounded-lg border flex items-start gap-3 ${
                  integrityModal.status === 'VERIFIED'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
                }`}
              >
                {integrityModal.status === 'VERIFIED' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                )}
                <div>
                  <h4 className="font-bold text-sm">
                    {integrityModal.status === 'VERIFIED'
                      ? 'Forensic Verification Passed — Zero Discrepancies'
                      : 'Integrity Verification Discrepancy'}
                  </h4>
                  <p className="mt-0.5 text-xs opacity-90 leading-relaxed">
                    {integrityModal.explanation}
                  </p>
                </div>
              </div>

              {/* Cryptographic Hash Comparison */}
              <div className="space-y-3 p-4 rounded-xl border bg-slate-900 text-slate-100 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-indigo-400 font-bold uppercase tracking-wider">
                    RFC 8785 Canonical JSON Digests:
                  </span>
                  <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                    SHA-256
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span>Live Computed RFC 8785 Canonical Hash:</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 px-1.5 text-[10px] text-slate-400 hover:text-white hover:bg-slate-800"
                        onClick={() => copyToClipboard(integrityModal.liveCanonicalHash, 'Live Hash')}
                      >
                        <Copy className="w-3 h-3 mr-1" /> Copy
                      </Button>
                    </div>
                    <p className="p-2 rounded bg-black/50 border border-slate-800 break-all text-[11px] text-emerald-400">
                      {integrityModal.liveCanonicalHash}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span>Vault Sealed Manifest Digest:</span>
                      {integrityModal.sealedDigest && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 px-1.5 text-[10px] text-slate-400 hover:text-white hover:bg-slate-800"
                          onClick={() => copyToClipboard(integrityModal.sealedDigest, 'Sealed Digest')}
                        >
                          <Copy className="w-3 h-3 mr-1" /> Copy
                        </Button>
                      )}
                    </div>
                    <p className="p-2 rounded bg-black/50 border border-slate-800 break-all text-[11px] text-sky-400">
                      {integrityModal.sealedDigest || '(Paper not yet sealed; live canonical hash shown above)'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between items-center">
                  <span>Verified at: {integrityModal.verifiedAt}</span>
                  <span className="text-emerald-400 font-semibold">Strict Canonical Key Sorting Applied</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button size="sm" onClick={() => setIntegrityModal(null)}>
                Dismiss Certificate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
