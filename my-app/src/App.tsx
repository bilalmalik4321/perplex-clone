import React, { useState } from 'react';
import './App.css';
import Exa from 'exa-js';
import OpenAI from 'openai';

function App() {
  const [query, setQuery] = useState<string>(''); // User query
  const [result, setResult] = useState<string | null>(null); // AI-generated response
  const [sources, setSources] = useState<any[]>([]); // Sources from Exa
  const [loading, setLoading] = useState<boolean>(false); // Loading state
  const [error, setError] = useState<string | null>(null); // Error state
  const [relatedQuestions, setRelatedQuestions] = useState<string[]>([]); // Related questions

  // OpenAI API configuration
  const openai = new OpenAI({
    apiKey: '',
    dangerouslyAllowBrowser: true
  });

  const extractUrlsFromResponse = (response: string): string[] => {
    const urlRegex = /https?:\/\/[^\s\)]+/g;
    return response.match(urlRegex) || [];
  };

  const fetchFavicon = (url: string) => {
    const faviconUrl = new URL('/favicon.ico', url).href;
    return faviconUrl;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setSources([]);
    setError(null);
    setRelatedQuestions([]);

    const exa = new Exa('');

    try {
      // Step 1: Generate relevant sources (URLs) using OpenAI
      const aiSourceResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: `Given the query: "${query}", provide a list of relevant URLs or sources that could be used to answer the question.` }
        ],
      });

      // Extract URLs from the AI response
      const rawResponse = aiSourceResponse.choices[0]?.message?.content?.trim() || '';
      const sourceURLs = extractUrlsFromResponse(rawResponse);

      if (sourceURLs.length === 0) {
        throw new Error('No valid URLs found in the response.');
      }

      // Step 2: Fetch content using Exa API
      const exaResponse = await exa.getContents(sourceURLs, { text: true });

      // Adjust mapping based on Exa response structure
      const fetchedSources = exaResponse.results.map((source: any) => ({
        url: source.url,
        favicon: fetchFavicon(source.url),
        text: source.text
      }));
      setSources(fetchedSources);

      // Step 3: Generate AI response based on fetched Exa sources
      const context = fetchedSources.map((src: any) => src.text).join('\n'); // Combine Exa response texts
      const aiSummaryResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: `Given the following texts from various sources, summarize them:\n\n${context}` }
        ],
      });

      setResult(aiSummaryResponse.choices[0]?.message?.content?.trim() || 'No response generated.');

      // Step 4: Get related questions
      const relatedQuestionsResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: `Given the query: "${query}", provide a list of related questions that might also be useful. Just list them - no yap` }
        ],
      });

      const relatedQuestionsList = relatedQuestionsResponse.choices[0]?.message?.content?.trim().split('\n') || [];
      setRelatedQuestions(relatedQuestionsList);
    } catch (err: any) {
      console.error('Error:', err);
      setError('An error occurred while processing your query.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Perplexity AI Clone</h1>
        <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Ask a question..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ padding: '8px', width: '300px', marginRight: '8px' }}
          />
          <button type="submit" style={{ padding: '8px 16px' }}>
            Submit
          </button>
        </form>

        {loading && <p>Loading...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {result && (
          <div>
            {sources.length > 0 && (
              <div>
                <h2>Sources:</h2>
                <div className="sources-container">
                  {sources.map((source, index) => (
                    <div className="source-box" key={index}>
                      <img src={source.favicon} alt="favicon" className="favicon" />
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="source-link">
                        {source.url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <h3>AI Summary of Sources:</h3>
            <p>{result}</p>

            {/* Related Questions */}
            {relatedQuestions.length > 0 && (
              <div>
                <h3>Related Questions:</h3>
                <ul>
                  {relatedQuestions.map((question, index) => (
                    <li key={index}>{question}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </header>
    </div>
  );
}

export default App;

