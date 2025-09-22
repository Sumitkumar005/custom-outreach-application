import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f9f9f9;
`;

const UploadCard = styled.div`
  width: 400px;
  padding: 40px;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
`;

const UploadTitle = styled.h2`
  font-size: 24px;
  margin-bottom: 20px;
  color: #333;
`;

const Instructions = styled.p`
  font-size: 14px;
  color: #666;
  margin-bottom: 30px;
`;

const Button = styled.button`
  padding: 10px 20px;
  background-color: #00bcd4;
  color: #fff;
  font-size: 16px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: #0097a7;
  }
`;

const DropzoneArea = styled.div`
  border: 2px dashed #00bcd4;
  padding: 30px;
  border-radius: 10px;
  background-color: #f3f8fc;
  cursor: pointer;
  transition: background-color 0.3s ease;
  
  &:hover {
    background-color: #e1f5fe;
  }
`;

const FileName = styled.p`
  margin-top: 20px;
  color: #333;
  font-size: 16px;
`;

const FileUpload = () => {
  const [fileName, setFileName] = useState<string>('');
  
  const onDrop = (acceptedFiles: File[]) => {
    setFileName(acceptedFiles[0]?.name || 'No file chosen');
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'text/csv': ['.csv'] },
    onDrop,
  });

  return (
    <Container>
      <UploadCard>
        <UploadTitle>Upload CSV Batch</UploadTitle>
        <Instructions>Upload a CSV file with columns: Country, State/City, Name, Designation, Mail, University</Instructions>
        <div {...getRootProps()}>
          <DropzoneArea>
            <input {...getInputProps()} />
            <p>Drag & drop a CSV file here, or click to select one</p>
          </DropzoneArea>
        </div>
        {fileName && <FileName>{fileName}</FileName>}
        <Button>Process CSV Batch</Button>
      </UploadCard>
    </Container>
  );
};

export default FileUpload;
