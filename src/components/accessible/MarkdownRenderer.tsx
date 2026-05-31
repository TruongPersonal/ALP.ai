'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  return (
    <div className="prose prose-blue max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Tinh chỉnh tiêu đề H1-H6
          h1: ({ children }) => {
            const text = React.Children.toArray(children).join('');
            return (
              <h1
                id={slugify(text)}
                className="mt-6 mb-4 text-3xl font-extrabold text-gray-900 dark:text-white border-b pb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                {children}
              </h1>
            );
          },
          h2: ({ children }) => {
            const text = React.Children.toArray(children).join('');
            return (
              <h2
                id={slugify(text)}
                className="mt-6 mb-3 text-2xl font-bold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                {children}
              </h2>
            );
          },
          h3: ({ children }) => {
            const text = React.Children.toArray(children).join('');
            return (
              <h3
                id={slugify(text)}
                className="mt-5 mb-2 text-xl font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                {children}
              </h3>
            );
          },
          h4: ({ children }) => {
            const text = React.Children.toArray(children).join('');
            return (
              <h4
                id={slugify(text)}
                className="mt-4 mb-2 text-lg font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                {children}
              </h4>
            );
          },
          // Tinh chỉnh đoạn văn xuôi
          p: ({ children }) => (
            <p className="mb-4 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
              {children}
            </p>
          ),
          // Danh sách gán role="list"
          ul: ({ children }) => (
            <ul role="list" className="list-disc pl-6 mb-4 space-y-2 text-lg text-gray-700 dark:text-gray-300">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol role="list" className="list-decimal pl-6 mb-4 space-y-2 text-lg text-gray-700 dark:text-gray-300">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          // Bảng dữ liệu tiếp cận gán scope="col"
          table: ({ children }) => (
            <div className="overflow-x-auto my-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50 dark:bg-gray-800">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-950">{children}</tbody>
          ),
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => (
            <th
              scope="col"
              className="px-6 py-3 text-left text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider border-b"
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-6 py-4 text-base text-gray-700 dark:text-gray-300 whitespace-pre-line border-b">
              {children}
            </td>
          ),
          // Liên kết an toàn và mô tả rõ đích đến
          a: ({ href, children }) => {
            const isExternal = href?.startsWith('http');
            const linkText = React.Children.toArray(children).join('');
            return (
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                aria-label={isExternal ? `${linkText} (Mở liên kết ngoài trong tab mới)` : undefined}
                className="text-blue-600 dark:text-blue-400 underline font-medium hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                {children}
              </a>
            );
          },
          // Khối trích dẫn
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 py-1 my-4 italic text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-r">
              {children}
            </blockquote>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
