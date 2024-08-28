import React, { useState } from 'react';
import tar from 'tar-stream';

const OvaExtractor = () => {
    const [files, setFiles] = useState([]);
    const [isExtracting, setIsExtracting] = useState(false);
    const [error, setError] = useState(null);
    const [fileName, setFileName] = useState('');

    const handleFileUpload = (event) => {
        setError(null);
        const file = event.target.files[0];
        if (!file) {
            setFileName('');
            return;
        }

        setFileName(file.name);
        setIsExtracting(true);

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const arrayBuffer = e.target.result;
                extractTar(new Uint8Array(arrayBuffer));
            } catch (err) {
                setIsExtracting(false);
                setError('Ошибка при извлечении файла.');
            }
        };

        reader.onerror = () => {
            setIsExtracting(false);
            setError('Ошибка чтения файла. Пожалуйста, попробуйте снова.');
        };

        reader.readAsArrayBuffer(file);
    };

    const extractTar = (buffer) => {
        try {
            const extract = tar.extract();
            const extractedFiles = [];

            extract.on('entry', (header, stream, next) => {
                const chunks = [];
                stream.on('data', (chunk) => chunks.push(chunk));
                stream.on('error', () => {
                    setError(`Ошибка при извлечении файла: ${header.name}`);
                    setIsExtracting(false);
                });
                stream.on('end', () => {
                    try {
                        const content = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
                        let offset = 0;
                        chunks.forEach(chunk => {
                            content.set(chunk, offset);
                            offset += chunk.length;
                        });

                        extractedFiles.push({ name: header.name, content });
                        next();
                    } catch (err) {
                        setError(`Ошибка при обработке содержимого файла: ${header.name}`);
                        setIsExtracting(false);
                    }
                });
            });

            extract.on('finish', () => {
                setFiles(extractedFiles);
                setIsExtracting(false);
            });

            extract.on('error', () => {
                setError('Ошибка при извлечении архива.');
                setIsExtracting(false);
            });

            extract.end(buffer);
        } catch (err) {
            setError('Ошибка при обработке архива.');
            setIsExtracting(false);
        }
    };

    const downloadFile = (name, content) => {
        const blob = new Blob([content], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="ova-extractor-container">
            <input
                type="file"
                accept=".ova"
                onChange={handleFileUpload}
                id="file-upload"
                style={{ display: 'none' }}
            />
            <label htmlFor="file-upload" className="file-upload-label">
                Выберите файл
            </label>
            <div className="file-name">
                {fileName ? fileName : 'Файл не выбран'}
            </div>

            {isExtracting && (
                <div className="spinner-container">
                    <div className="spinner"></div>
                    <p>Извлечение файлов, пожалуйста, подождите...</p>
                </div>
            )}

            {error && <p className="error-message">{error}</p>}

            {!isExtracting && !error && files.length > 0 && (
                <ul className="file-list">
                    {files.map((file, index) => (
                        <li key={index}>
                            <strong>{file.name}:</strong>
                            <button onClick={() => downloadFile(file.name, file.content)}>Скачать</button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default OvaExtractor;
