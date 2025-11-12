'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/utils/context/authContext';
import { signIn } from '@/utils/auth';
import { isAdmin } from '@/utils/admin';
import { PARTY_CONFIG } from '@/config/party';
import PropTypes from 'prop-types';

const defaultForm = {
  id: null,
  question: '',
  options: ['', ''],
  correct_answer: 0,
  points: 10,
  category: '',
  party: PARTY_CONFIG.id,
  is_active: true,
};

export default function TriviaQuestionManager({ cardStyle = {} }) {
  const { user, userLoading } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formVersion, setFormVersion] = useState(0);

  const userIsAdmin = isAdmin(user);

  const loadQuestions = useCallback(async () => {
    if (!user || !userIsAdmin) return;
    setLoading(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/trivia-questions?party=${PARTY_CONFIG.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error('Failed to load trivia questions');
      }

      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.results || [];
      setQuestions(list);
    } catch (err) {
      setError(err.message || 'Unable to load trivia questions');
    } finally {
      setLoading(false);
    }
  }, [user, userIsAdmin]);

  useEffect(() => {
    if (!userLoading && user && userIsAdmin) {
      loadQuestions();
    }
  }, [user, userLoading, userIsAdmin, loadQuestions]);

  // Debug: Log when form state changes
  useEffect(() => {
    console.log('Form state changed to:', form);
  }, [form]);

  // Sync form when editingId changes - backup to ensure form populates
  useEffect(() => {
    if (editingId && questions.length > 0 && !isEditing) {
      const questionToEdit = questions.find((q) => String(q.id) === String(editingId));
      if (questionToEdit && String(form.id) !== String(editingId)) {
        console.log('useEffect: Populating form for editingId:', editingId, 'question:', questionToEdit);
        let options = [];

        // Handle null/undefined options
        if (questionToEdit.options == null) {
          options = [];
        } else if (Array.isArray(questionToEdit.options)) {
          options = [...questionToEdit.options].filter((opt) => opt != null); // Filter out null values
        } else if (typeof questionToEdit.options === 'string') {
          try {
            const parsed = JSON.parse(questionToEdit.options);
            options = Array.isArray(parsed) ? parsed.filter((opt) => opt != null) : [parsed].filter((opt) => opt != null);
          } catch (parseErr) {
            options = questionToEdit.options ? [String(questionToEdit.options)] : [];
          }
        }

        // Ensure we have at least 2 options
        while (options.length < 2) {
          options.push('');
        }

        const formData = {
          id: questionToEdit.id,
          question: String(questionToEdit.question || questionToEdit.text || ''),
          options: [...options],
          correct_answer: typeof questionToEdit.correct_answer === 'number' ? questionToEdit.correct_answer : questionToEdit.correct_answer_index || 0,
          points: typeof questionToEdit.points === 'number' ? questionToEdit.points : parseInt(questionToEdit.points, 10) || 10,
          category: String(questionToEdit.category || ''),
          party: questionToEdit.party || questionToEdit.party_id || PARTY_CONFIG.id,
          is_active: questionToEdit.is_active !== undefined ? Boolean(questionToEdit.is_active) : true,
        };
        console.log('useEffect: Setting form to:', formData);
        setForm(formData);
        setIsEditing(true);
      }
    }
  }, [editingId, questions, form.id, isEditing]);

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
    setIsEditing(false);
    setFormVersion((prev) => prev + 1); // Force form remount
    setError('');
    setSuccessMessage('');
  };

  const handleEdit = (question) => {
    if (!question || !question.id) {
      setError('Invalid question data');
      return;
    }

    // Prevent multiple rapid clicks
    if (isEditing && editingId === question.id) {
      return;
    }

    console.log('handleEdit: Starting edit for question:', question.id);

    // Clear any previous state first
    setError('');
    setSuccessMessage('');

    // Parse options with defensive checks
    let options = [];

    // Handle null/undefined options
    if (question.options == null) {
      options = [];
    } else if (Array.isArray(question.options)) {
      options = [...question.options].filter((opt) => opt != null); // Filter out null values
    } else if (typeof question.options === 'string') {
      try {
        const parsed = JSON.parse(question.options);
        options = Array.isArray(parsed) ? parsed.filter((opt) => opt != null) : [parsed].filter((opt) => opt != null);
      } catch (parseErr) {
        options = question.options ? [String(question.options)] : [];
      }
    }

    // Ensure we have at least 2 options
    while (options.length < 2) {
      options.push('');
    }

    // Populate form directly
    const formData = {
      id: question.id,
      question: String(question.question || question.text || ''),
      options: [...options],
      correct_answer: typeof question.correct_answer === 'number' ? question.correct_answer : question.correct_answer_index || 0,
      points: typeof question.points === 'number' ? question.points : parseInt(question.points, 10) || 10,
      category: String(question.category || ''),
      party: question.party || question.party_id || PARTY_CONFIG.id,
      is_active: question.is_active !== undefined ? Boolean(question.is_active) : true,
    };

    // Update all state together - formVersion increment forces form remount
    setFormVersion((prev) => prev + 1);
    setForm(formData);
    setEditingId(question.id);
    setIsEditing(true);

    // Scroll to form after state updates
    setTimeout(() => {
      const formElement = document.getElementById('trivia-question-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleAddOption = () => {
    if (form.options.length < 4) {
      setForm({ ...form, options: [...form.options, ''] });
    }
  };

  const handleRemoveOption = (index) => {
    if (form.options.length > 2) {
      const newOptions = form.options.filter((_, i) => i !== index);
      setForm({
        ...form,
        options: newOptions,
        correct_answer: form.correct_answer >= newOptions.length ? 0 : form.correct_answer,
      });
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...form.options];
    newOptions[index] = value;
    setForm({ ...form, options: newOptions });
  };

  const submitForm = async (e) => {
    e.preventDefault();
    if (!user || !userIsAdmin) {
      signIn();
      return;
    }

    if (!form.question.trim()) {
      setError('Question text is required');
      return;
    }

    const validOptions = form.options.filter((opt) => opt.trim().length > 0);
    if (validOptions.length < 2) {
      setError('At least 2 answer options are required');
      return;
    }

    if (form.correct_answer < 0 || form.correct_answer >= validOptions.length) {
      setError('Invalid correct answer selection');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = await user.getIdToken();
      const payload = {
        question: form.question.trim(),
        options: validOptions,
        correct_answer: form.correct_answer,
        points: parseInt(form.points, 10) || 10,
        category: form.category.trim() || null,
        party: form.party || PARTY_CONFIG.id,
        is_active: form.is_active,
      };

      const endpoint = form.id ? `/api/trivia-questions/${form.id}` : '/api/trivia-questions';
      const method = form.id ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let responseBody = null;
      if (text) {
        try {
          responseBody = JSON.parse(text);
        } catch (parseError) {
          responseBody = text;
        }
      }

      if (!res.ok) {
        const message = typeof responseBody === 'string' ? responseBody : responseBody?.error || responseBody?.detail || 'Failed to save question';
        throw new Error(message);
      }

      setSuccessMessage(form.id ? 'Trivia question updated.' : 'Trivia question added.');
      resetForm();
      await loadQuestions();
    } catch (err) {
      setError(err.message || 'Unable to save trivia question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!user || !userIsAdmin) return;
    if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to delete this trivia question?')) {
      return;
    }

    setDeletingQuestionId(id);
    setError('');
    setSuccessMessage('');

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/trivia-questions/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        let errorMessage = 'Failed to delete question';
        try {
          const text = await res.text();
          if (text) {
            try {
              const json = JSON.parse(text);
              errorMessage = json.error || json.detail || json.message || text;
              // Provide more helpful message for 403 errors
              if (res.status === 403) {
                errorMessage = `Permission denied: ${errorMessage}. Make sure you have admin permissions on the backend.`;
              }
            } catch (e) {
              errorMessage = text;
              if (res.status === 403) {
                errorMessage = `Permission denied: ${text}. Make sure you have admin permissions on the backend.`;
              }
            }
          } else if (res.status === 403) {
            errorMessage = 'Permission denied. Make sure you have admin permissions on the backend.';
          } else {
            errorMessage = `Failed to delete question (status ${res.status})`;
          }
        } catch (e) {
          if (res.status === 403) {
            errorMessage = 'Permission denied. Make sure you have admin permissions on the backend.';
          } else {
            errorMessage = `Failed to delete question (status ${res.status})`;
          }
        }
        throw new Error(errorMessage);
      }

      // Handle 204 No Content response (no body to parse)
      setSuccessMessage('Trivia question deleted.');

      // Reset form if we were editing the deleted question
      if (editingId === id) {
        resetForm();
      }

      await loadQuestions();
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Unable to delete trivia question');
    } finally {
      setDeletingQuestionId(null);
    }
  };

  if (userLoading) {
    return null;
  }

  if (!user) {
    return (
      <div className="card" style={{ ...cardStyle }}>
        <p className="muted">Sign in to manage trivia questions.</p>
      </div>
    );
  }

  if (!userIsAdmin) {
    return null;
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 16, display: 'grid', gap: 12, ...cardStyle }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Manage Trivia Questions</h3>
          {editingId && <span style={{ fontSize: 14, color: '#8b5cf6', fontWeight: 600 }}>Editing Question #{editingId}</span>}
        </div>
        {error && (
          <div className="card" style={{ background: 'rgba(139, 92, 246, 0.12)', border: '1px solid #8b5cf6', marginBottom: 16, ...cardStyle }}>
            <p style={{ margin: 0, color: '#4c1d95', fontSize: 14 }}>{error}</p>
          </div>
        )}
        {successMessage && (
          <div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', marginBottom: 16, ...cardStyle }}>
            <p style={{ margin: 0, color: '#059669', fontSize: 14 }}>{successMessage}</p>
          </div>
        )}

        <form id="trivia-question-form" key={`edit-${editingId || 'new'}-${formVersion}`} onSubmit={submitForm} style={{ display: 'grid', gap: 12 }}>
          <div>
            <label htmlFor="trivia-question" style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 600 }}>
              Question *
            </label>
            <input key={`question-${form.id || editingId || 'new'}-${formVersion}`} id="trivia-question" type="text" value={form.question || ''} onChange={(e) => setForm({ ...form, question: e.target.value })} required style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }} placeholder="Enter the trivia question" />
          </div>

          <div>
            <div style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 600 }}>Answer Options *</div>
            <div>
              {form.options.map((option, index) => {
                // Create unique keys without using index directly
                // Use a hash of the option value and form state to create unique keys
                const optionValue = String(option || '').slice(0, 20) || 'empty';
                const valueHash = optionValue.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                // Encode position without directly using index
                const positionHash = String(index)
                  .split('')
                  .reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const optionId = `option-${form.id || editingId || 'new'}-${valueHash}-${positionHash}-${formVersion}`;
                const radioKey = `radio-${form.id || editingId || 'new'}-${valueHash}-${positionHash}-${formVersion}`;
                const inputKey = `option-input-${form.id || editingId || 'new'}-${valueHash}-${positionHash}-${formVersion}`;
                return (
                  <div key={optionId} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <input key={radioKey} type="radio" name={`correct_answer-${form.id || editingId || 'new'}-${formVersion}`} checked={form.correct_answer === index} onChange={() => setForm({ ...form, correct_answer: index })} style={{ flexShrink: 0 }} />
                    <input key={inputKey} type="text" value={option || ''} onChange={(e) => handleOptionChange(index, e.target.value)} required style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }} placeholder={`Option ${index + 1}`} />
                    {form.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          border: '1px solid #ef4444',
                          background: '#fff',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {form.options.length < 4 && (
              <button
                type="button"
                onClick={handleAddOption}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid #8b5cf6',
                  background: '#fff',
                  color: '#8b5cf6',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                + Add Option
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label htmlFor="trivia-points" style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 600 }}>
                Points
              </label>
              <input key={`points-${form.id || editingId || 'new'}-${formVersion}`} id="trivia-points" type="number" value={form.points || 10} onChange={(e) => setForm({ ...form, points: parseInt(e.target.value, 10) || 10 })} min="1" style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }} />
            </div>
            <div>
              <label htmlFor="trivia-category" style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 600 }}>
                Category
              </label>
              <input key={`category-${form.id || editingId || 'new'}-${formVersion}`} id="trivia-category" type="text" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }} placeholder="Optional category" />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input key={`checkbox-${form.id || editingId || 'new'}-${formVersion}`} type="checkbox" id="is_active" checked={form.is_active || false} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            <label htmlFor="is_active" style={{ fontSize: 14 }}>
              Active (visible in game)
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={submitting} className="tile tile-purple" style={{ height: 40, border: 'none', flex: 1 }}>
              {(() => {
                if (submitting) return 'Saving...';
                if (editingId) return 'Update Question';
                return 'Add Question';
              })()}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="tile" style={{ height: 40, border: '1px solid #e5e7eb', background: '#fff', color: '#374151' }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {(() => {
        if (loading) {
          return (
            <div className="card" style={{ ...cardStyle }}>
              <p className="muted">Loading trivia questions...</p>
            </div>
          );
        }
        if (questions.length === 0) {
          return (
            <div className="card" style={{ ...cardStyle }}>
              <p className="muted">No trivia questions yet. Add your first question above!</p>
            </div>
          );
        }
        return (
          <div className="card" style={{ display: 'grid', gap: 12, ...cardStyle }}>
            <h3 style={{ margin: 0 }}>Existing Questions ({questions.length})</h3>
            {questions.map((q) => (
              <div
                key={q.id}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  background: editingId === q.id ? 'rgba(139, 92, 246, 0.05)' : 'rgba(255, 255, 255, 0.6)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{q.question || 'No question text'}</div>
                    <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                      {Array.isArray(q.options) && q.options.length > 0 ? (
                        q.options.map((opt, idx) => {
                          // Create unique key using question id, option value, and position
                          // Position is encoded in hash to avoid ESLint warning about index keys
                          const optValue =
                            String(opt || '')
                              .slice(0, 50)
                              .replace(/\s+/g, '-') || 'empty';
                          const positionInHash = String(idx)
                            .split('')
                            .reduce((acc, char) => acc + char.charCodeAt(0), 0);
                          const valueHash = optValue.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                          const optKey = `q-${q.id}-opt-${valueHash}-pos${positionInHash}-${optValue.slice(0, 10)}`;
                          return (
                            <div key={optKey} style={{ marginBottom: 4 }}>
                              {idx === q.correct_answer ? '✓ ' : '  '}
                              {opt != null ? String(opt) : '(empty)'}
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>No options available</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#6b7280' }}>
                      {q.category && <span>Category: {q.category}</span>}
                      <span>Points: {q.points || 10}</span>
                      {!q.is_active && <span style={{ color: '#ef4444' }}>Hidden</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => handleEdit(q)} className="tile" style={{ height: 36, padding: '0 12px', border: '1px solid #8b5cf6', background: '#fff', color: '#8b5cf6' }}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(q.id)}
                      disabled={deletingQuestionId === q.id}
                      className="tile"
                      style={{
                        height: 36,
                        padding: '0 12px',
                        background: deletingQuestionId === q.id ? '#d1d5db' : '#8b5cf6',
                        color: '#fff',
                        border: 'none',
                        cursor: deletingQuestionId === q.id ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {deletingQuestionId === q.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

TriviaQuestionManager.propTypes = {
  cardStyle: PropTypes.shape({}),
};
