'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { useMyProfile } from '@/hooks/useQueries';
import { 
    ArrowLeft, 
    Camera, 
    Upload, 
    Check, 
    IdCard, 
    UserCheck, 
    FileText, 
    RefreshCw, 
    AlertCircle, 
    X,
    FileSpreadsheet,
    Smile,
    ShieldCheck
} from 'lucide-react';

type Step = 'document-type' | 'document-photo' | 'selfie-photo' | 'submitting' | 'success';
type DocType = 'rg' | 'cnh' | 'passport';

export default function VerificationPage() {
    const router = useTransitionRouter();
    const { refetch: refetchProfile } = useMyProfile();

    const [step, setStep] = useState<Step>('document-type');
    const [documentType, setDocumentType] = useState<DocType | null>(null);
    const [documentPhoto, setDocumentPhoto] = useState<Blob | null>(null);
    const [selfiePhoto, setSelfiePhoto] = useState<Blob | null>(null);
    
    // Estados do Preview
    const [documentPreview, setDocumentPreview] = useState<string | null>(null);
    const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

    // Estados da Câmera
    const [cameraActive, setCameraActive] = useState<boolean>(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);

    // Outros estados
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [isMobile, setIsMobile] = useState<boolean>(false);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const selfieInputRef = useRef<HTMLInputElement | null>(null);
    const documentInputRef = useRef<HTMLInputElement | null>(null);

    // Detecta se é dispositivo móvel
    useEffect(() => {
        const checkMobile = () => {
            const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
            const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
            setIsMobile(mobileRegex.test(userAgent));
        };
        checkMobile();
    }, []);

    // Limpa streams de câmera ao desmontar
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    // Anexa o stream ao elemento video assim que ele for montado no DOM
    useEffect(() => {
        if (cameraActive && stream && videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [cameraActive, stream]);

    // Inicializa câmera
    const startCamera = async (facingMode: 'user' | 'environment') => {
        setCameraError(null);
        setErrorMsg(null);
        try {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });

            setStream(mediaStream);
            setCameraActive(true);
        } catch (err: any) {
            console.error('Erro ao acessar a câmera:', err);
            setCameraError(
                'Não foi possível acessar a câmera. Por favor, conceda permissão ou envie uma imagem da galeria.'
            );
            setCameraActive(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setCameraActive(false);
    };

    // Capturar frame do vídeo
    const capturePhoto = () => {
        if (!videoRef.current || !stream) return;

        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Desenha o frame atual da câmera
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (blob) {
                if (step === 'document-photo') {
                    setDocumentPhoto(blob);
                    setDocumentPreview(URL.createObjectURL(blob));
                } else if (step === 'selfie-photo') {
                    setSelfiePhoto(blob);
                    setSelfiePreview(URL.createObjectURL(blob));
                }
                stopCamera();
            }
        }, 'image/jpeg', 0.9);
    };

    // Fallback para upload de arquivo da Galeria
    const triggerFileSelect = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Limpa o valor anterior para disparar onChange sempre
            fileInputRef.current.click();
        }
    };

    const triggerMobileCamera = () => {
        setErrorMsg(null);
        setCameraError(null);
        if (step === 'document-photo') {
            if (documentInputRef.current) {
                documentInputRef.current.value = '';
                documentInputRef.current.click();
            }
        } else if (step === 'selfie-photo') {
            if (selfieInputRef.current) {
                selfieInputRef.current.value = '';
                selfieInputRef.current.click();
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setErrorMsg('Por favor, selecione um arquivo de imagem.');
            return;
        }

        const previewUrl = URL.createObjectURL(file);

        if (step === 'document-photo') {
            setDocumentPhoto(file);
            setDocumentPreview(previewUrl);
        } else if (step === 'selfie-photo') {
            setSelfiePhoto(file);
            setSelfiePreview(previewUrl);
        }
        stopCamera();
        setErrorMsg(null);
    };

    // Enviar dados para o servidor
    const handleSubmit = async () => {
        if (!documentPhoto || !selfiePhoto || !documentType) {
            setErrorMsg('Por favor, complete todas as etapas do fluxo.');
            return;
        }

        setIsUploading(true);
        setErrorMsg(null);
        setStep('submitting');

        const formData = new FormData();
        formData.append('document', documentPhoto, 'document.jpg');
        formData.append('selfie', selfiePhoto, 'selfie.jpg');
        formData.append('documentType', documentType);

        try {
            const response = await fetch('/api/users/me/identity-verification', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao enviar documentos');
            }

            // Forçar refetch do perfil local do usuário logado
            await refetchProfile();
            setStep('success');
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message || 'Erro de conexão com o servidor. Tente novamente.');
            setStep('document-type'); // Volta ao início em caso de falha grave
        } finally {
            setIsUploading(false);
        }
    };

    // Assistente de renderização dos passos
    const renderStepContent = () => {
        switch (step) {
            case 'document-type':
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-xl font-bold text-gray-900">Selecione o tipo de documento</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Escolha uma das opções abaixo com foto para fazermos a validação do selo verificado do seu perfil.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    setDocumentType('rg');
                                    setStep('document-photo');
                                }}
                                className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50/20 active:scale-[0.99] rounded-2xl transition-all shadow-sm text-left group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-100">
                                        <IdCard className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800 text-sm">Registro Geral (RG)</p>
                                        <p className="text-xs text-gray-400">Documento de identidade nacional</p>
                                    </div>
                                </div>
                                <span className="text-purple-600 font-medium text-xs opacity-0 group-hover:opacity-100 transition-opacity">Selecionar</span>
                            </button>

                            <button
                                onClick={() => {
                                    setDocumentType('cnh');
                                    setStep('document-photo');
                                }}
                                className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50/20 active:scale-[0.99] rounded-2xl transition-all shadow-sm text-left group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-100">
                                        <FileSpreadsheet className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800 text-sm">Carteira de Habilitação (CNH)</p>
                                        <p className="text-xs text-gray-400">Carteira de motorista física original</p>
                                    </div>
                                </div>
                                <span className="text-purple-600 font-medium text-xs opacity-0 group-hover:opacity-100 transition-opacity">Selecionar</span>
                            </button>

                            <button
                                onClick={() => {
                                    setDocumentType('passport');
                                    setStep('document-photo');
                                }}
                                className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50/20 active:scale-[0.99] rounded-2xl transition-all shadow-sm text-left group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-100">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800 text-sm">Passaporte</p>
                                        <p className="text-xs text-gray-400">Passaporte oficial emitido pela PF</p>
                                    </div>
                                </div>
                                <span className="text-purple-600 font-medium text-xs opacity-0 group-hover:opacity-100 transition-opacity">Selecionar</span>
                            </button>
                        </div>
                    </div>
                );

            case 'document-photo':
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Passo 1 de 2</span>
                            <h2 className="text-xl font-bold text-gray-900 mt-2">Foto do seu documento</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Posicione a frente do seu documento com foto dentro do retângulo. Garanta boa iluminação e legibilidade.
                            </p>
                        </div>

                        {/* Câmera / Preview Area */}
                        <div className="flex flex-col items-center justify-center">
                            {cameraActive ? (
                                <div className="relative aspect-[4/3] w-full max-w-md bg-black rounded-3xl overflow-hidden shadow-2xl border border-gray-800">
                                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                    
                                    {/* Guia retangular */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-[85%] h-[65%] border-2 border-dashed border-white rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                                            <div className="absolute inset-0 border-2 border-purple-500 rounded-2xl animate-pulse" />
                                            <div className="absolute -top-8 left-0 right-0 text-center text-white text-[11px] font-bold bg-purple-600/80 backdrop-blur-sm py-1 px-2 rounded-md max-w-fit mx-auto">
                                                Enquadre o documento aqui
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : documentPreview ? (
                                <div className="relative aspect-[4/3] w-full max-w-md rounded-3xl overflow-hidden border border-gray-200 shadow-md">
                                    <img src={documentPreview} alt="Preview do documento" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => {
                                            setDocumentPreview(null);
                                            setDocumentPhoto(null);
                                        }}
                                        className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="aspect-[4/3] w-full max-w-md rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                                    <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
                                        <IdCard className="w-8 h-8" />
                                    </div>
                                    <p className="text-sm font-semibold text-gray-700">Nenhuma foto tirada</p>
                                    <p className="text-xs text-gray-400 mt-1 max-w-[240px]">
                                        Abra a câmera do dispositivo ou envie um arquivo de imagem da sua galeria.
                                    </p>
                                </div>
                            )}

                            {/* Controles de Câmera */}
                            <div className="mt-6 flex flex-wrap gap-3 justify-center w-full max-w-md">
                                {cameraActive ? (
                                    <>
                                        <button
                                            onClick={capturePhoto}
                                            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold py-3 px-5 rounded-2xl shadow-lg shadow-purple-600/15 active:scale-[0.98] transition-all text-sm"
                                        >
                                            <Camera className="w-4 h-4" />
                                            Tirar Foto
                                        </button>
                                        <button
                                            onClick={stopCamera}
                                            className="flex h-12 w-12 items-center justify-center bg-gray-100 hover:bg-gray-200 active:scale-[0.95] text-gray-700 rounded-2xl transition-all"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => isMobile ? triggerMobileCamera() : startCamera('environment')}
                                            className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-semibold py-3 px-4 rounded-2xl shadow-md transition-all text-sm"
                                        >
                                            <Camera className="w-4 h-4" />
                                            {documentPhoto ? 'Tirar outra foto' : 'Abrir Câmera'}
                                        </button>
                                        <button
                                            onClick={triggerFileSelect}
                                            className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 active:scale-[0.98] text-gray-700 font-semibold py-3 px-4 rounded-2xl shadow-sm transition-all text-sm"
                                        >
                                            <Upload className="w-4 h-4" />
                                            Escolher da Galeria
                                        </button>
                                    </>
                                )}
                            </div>

                            {cameraError && (
                                <p className="text-xs text-red-500 bg-red-50 border border-red-100 p-3 rounded-xl mt-4 max-w-md text-center">
                                    {cameraError}
                                </p>
                            )}
                        </div>

                        {/* Ações de Avanço */}
                        {documentPhoto && !cameraActive && (
                            <div className="pt-4 border-t border-gray-100 flex gap-3">
                                <button
                                    onClick={() => {
                                        setStep('document-type');
                                        setDocumentPhoto(null);
                                        setDocumentPreview(null);
                                    }}
                                    className="flex-1 py-3.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold rounded-2xl transition-all active:scale-[0.99] text-sm text-center"
                                >
                                    Voltar
                                </button>
                                <button
                                    onClick={() => setStep('selfie-photo')}
                                    className="flex-1 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-2xl shadow-lg shadow-purple-600/10 transition-all active:scale-[0.99] text-sm text-center"
                                >
                                    Confirmar e Continuar
                                </button>
                            </div>
                        )}
                    </div>
                );

            case 'selfie-photo':
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Passo 2 de 2</span>
                            <h2 className="text-xl font-bold text-gray-900 mt-2">Selfie segurando o documento</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Tire uma foto segurando o seu documento de identificação ao lado do seu rosto. Precisamos ver nitidamente você e o documento.
                            </p>
                        </div>

                        {/* Câmera / Preview Area */}
                        <div className="flex flex-col items-center justify-center">
                            {cameraActive ? (
                                <div className="relative aspect-[4/3] w-full max-w-md bg-black rounded-3xl overflow-hidden shadow-2xl border border-gray-800">
                                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                    
                                    {/* Guia oval para selfie */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-[70%] h-[80%] border-2 border-dashed border-white rounded-full relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                                            <div className="absolute inset-0 border-2 border-purple-500 rounded-full animate-pulse" />
                                            <div className="absolute -top-8 left-0 right-0 text-center text-white text-[11px] font-bold bg-purple-600/80 backdrop-blur-sm py-1 px-2 rounded-md max-w-fit mx-auto">
                                                Enquadre seu rosto e o documento
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : selfiePreview ? (
                                <div className="relative aspect-[4/3] w-full max-w-md rounded-3xl overflow-hidden border border-gray-200 shadow-md">
                                    <img src={selfiePreview} alt="Preview da selfie" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => {
                                            setSelfiePreview(null);
                                            setSelfiePhoto(null);
                                        }}
                                        className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="aspect-[4/3] w-full max-w-md rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                                    <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
                                        <Smile className="w-8 h-8" />
                                    </div>
                                    <p className="text-sm font-semibold text-gray-700">Nenhuma foto tirada</p>
                                    <p className="text-xs text-gray-400 mt-1 max-w-[240px]">
                                        Abra a câmera frontal ou envie um arquivo contendo sua selfie com documento.
                                    </p>
                                </div>
                            )}

                            {/* Controles de Câmera */}
                            <div className="mt-6 flex flex-wrap gap-3 justify-center w-full max-w-md">
                                {cameraActive ? (
                                    <>
                                        <button
                                            onClick={capturePhoto}
                                            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold py-3 px-5 rounded-2xl shadow-lg shadow-purple-600/15 active:scale-[0.98] transition-all text-sm"
                                        >
                                            <Camera className="w-4 h-4" />
                                            Tirar Foto
                                        </button>
                                        <button
                                            onClick={stopCamera}
                                            className="flex h-12 w-12 items-center justify-center bg-gray-100 hover:bg-gray-200 active:scale-[0.95] text-gray-700 rounded-2xl transition-all"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => isMobile ? triggerMobileCamera() : startCamera('user')} // Abre a frontal para a selfie
                                            className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-semibold py-3 px-4 rounded-2xl shadow-md transition-all text-sm"
                                        >
                                            <Camera className="w-4 h-4" />
                                            {selfiePhoto ? 'Tirar outra selfie' : 'Abrir Câmera Frontal'}
                                        </button>
                                        <button
                                            onClick={triggerFileSelect}
                                            className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 active:scale-[0.98] text-gray-700 font-semibold py-3 px-4 rounded-2xl shadow-sm transition-all text-sm"
                                        >
                                            <Upload className="w-4 h-4" />
                                            Escolher da Galeria
                                        </button>
                                    </>
                                )}
                            </div>

                            {cameraError && (
                                <p className="text-xs text-red-500 bg-red-50 border border-red-100 p-3 rounded-xl mt-4 max-w-md text-center">
                                    {cameraError}
                                </p>
                            )}
                        </div>

                        {/* Ações de Envio */}
                        {selfiePhoto && !cameraActive && (
                            <div className="pt-4 border-t border-gray-100 flex gap-3">
                                <button
                                    onClick={() => {
                                        setStep('document-photo');
                                        setSelfiePhoto(null);
                                        setSelfiePreview(null);
                                    }}
                                    className="flex-1 py-3.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold rounded-2xl transition-all active:scale-[0.99] text-sm text-center"
                                >
                                    Voltar
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="flex-1 py-3.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-2xl shadow-lg shadow-purple-600/10 transition-all active:scale-[0.99] text-sm text-center"
                                >
                                    Enviar Documentos
                                </button>
                            </div>
                        )}
                    </div>
                );

            case 'submitting':
                return (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="relative flex items-center justify-center">
                            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                            <RefreshCw className="w-6 h-6 text-purple-600 absolute animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Enviando seus documentos</h3>
                            <p className="text-sm text-gray-500 mt-2 max-w-[260px] mx-auto leading-relaxed">
                                Estamos processando o upload seguro das imagens para o servidor. Por favor, aguarde alguns instantes...
                            </p>
                        </div>
                    </div>
                );

            case 'success':
                return (
                    <div className="py-8 flex flex-col items-center text-center space-y-6 animate-in fade-in duration-500">
                        <div className="h-20 w-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/25 animate-bounce">
                            <UserCheck className="w-10 h-10" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Verificação Enviada!</h2>
                            <p className="text-sm text-gray-600 max-w-[280px] mx-auto leading-relaxed">
                                Suas fotos foram recebidas com sucesso. O processo de análise da sua identidade pode levar até 48 horas.
                            </p>
                        </div>

                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-left max-w-sm w-full space-y-2.5">
                            <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Próximos Passos</h4>
                            <ul className="text-xs text-emerald-700 space-y-1.5 list-disc list-inside">
                                <li>A liberação do seu selo de verificado ocorrerá após a validação.</li>
                                <li>O status da verificação pode ser acompanhado nos Ajustes.</li>
                                <li>Quando aprovada, o ícone verificado aparecerá no seu perfil.</li>
                            </ul>
                        </div>

                        <button
                            onClick={() => router.push('/settings')}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold rounded-2xl shadow-lg shadow-purple-600/20 hover:from-purple-700 hover:to-fuchsia-700 transition-all active:scale-[0.99] text-sm"
                        >
                            Voltar para Configurações
                        </button>
                    </div>
                );
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-5 h-[72px] flex items-center justify-between sticky top-0 z-10 shadow-md">
                <div className="flex items-center gap-3">
                    {step !== 'success' && step !== 'submitting' ? (
                        <button
                            onClick={() => {
                                if (step === 'document-photo') {
                                    setStep('document-type');
                                    stopCamera();
                                } else if (step === 'selfie-photo') {
                                    setStep('document-photo');
                                    stopCamera();
                                } else {
                                    router.push('/settings');
                                }
                            }}
                            className="p-2 hover:bg-white/10 active:bg-white/20 rounded-full transition-all text-white"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    ) : null}
                    <div>
                        <h1 className="text-lg font-bold text-white leading-tight">Validação de Identidade</h1>
                        <p className="text-[11px] text-purple-200 font-semibold tracking-wide">Mimo Chat</p>
                    </div>
                </div>
                <div className="flex items-center">
                    <ShieldCheck className="w-6 h-6 text-white/40 animate-pulse" />
                </div>
            </div>

            {/* Container Principal */}
            <div className="flex-1 flex flex-col justify-center items-center p-4">
                <div className="w-full max-w-md bg-white border border-gray-100 rounded-[32px] p-6 shadow-xl shadow-gray-200/50">
                    
                    {/* Mensagem de Erro Geral */}
                    {errorMsg && (
                        <div className="mb-4 flex gap-3 p-3 bg-red-50 border border-red-100 rounded-2xl text-red-700 animate-in fade-in slide-in-from-top-2 duration-300">
                            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                            <p className="text-xs font-semibold leading-normal">{errorMsg}</p>
                        </div>
                    )}

                    {/* Conteúdo do Passo Atual */}
                    {renderStepContent()}
                </div>
            </div>

            {/* Input Oculto de Arquivos */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/jpeg, image/png, image/gif, image/heic, image/webp" 
                className="hidden" 
            />

            {/* Inputs Ocultos de Câmera (Mobile) */}
            <input 
                type="file" 
                ref={selfieInputRef} 
                onChange={handleFileChange} 
                accept="image/jpeg, image/png, image/gif, image/heic, image/webp" 
                capture="user"
                className="hidden" 
            />
            <input 
                type="file" 
                ref={documentInputRef} 
                onChange={handleFileChange} 
                accept="image/jpeg, image/png, image/gif, image/heic, image/webp" 
                capture="environment"
                className="hidden" 
            />
        </div>
    );
}
