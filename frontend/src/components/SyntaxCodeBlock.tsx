import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Props {
  code: string;
  language: string;
}

/** Loaded only when a message actually contains a fenced code block. */
export default function SyntaxCodeBlock({ code, language }: Props) {
  return (
    <SyntaxHighlighter
      style={oneDark}
      language={language}
      PreTag="div"
      customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.8rem', background: '#111' }}
    >
      {code}
    </SyntaxHighlighter>
  );
}
