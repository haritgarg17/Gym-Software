'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { Dumbbell, Utensils, Award, Plus, Layers, Flame, Droplet, Clock, Loader2 } from 'lucide-react';

export default function WorkoutDietDirectory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'workout' | 'diet'>('workout');

  // Queries
  const { data: workoutsData, isLoading: workoutsLoading } = useQuery({
    queryKey: ['workoutPlans'],
    queryFn: () => api.get<any>('/workout'),
    enabled: !!user,
  });

  const { data: dietsData, isLoading: dietsLoading } = useQuery({
    queryKey: ['dietPlans'],
    queryFn: () => api.get<any>('/diet'),
    enabled: !!user,
  });

  const workouts = workoutsData?.data?.plans || [];
  const diets = dietsData?.data?.plans || [];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Workout & Diet Plans</h1>
        <p className="text-slate-500 mt-1">Custom schedules, nutrition meal targets, and daily fitness routines.</p>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('workout')}
          className={`px-6 py-3 font-semibold text-sm transition border-b-2 -mb-0.5 ${
            activeTab === 'workout' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Workout Routines
        </button>
        <button
          onClick={() => setActiveTab('diet')}
          className={`px-6 py-3 font-semibold text-sm transition border-b-2 -mb-0.5 ${
            activeTab === 'diet' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Nutrition & Diets
        </button>
      </div>

      {/* WORKOUT PLAN TAB */}
      {activeTab === 'workout' && (
        workoutsLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {workouts.map((plan: any) => (
              <div key={plan.id} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-900 mb-6">
                  <div>
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Assigned by Trainer: {plan.trainer?.user?.firstName} {plan.trainer?.user?.lastName}</p>
                  </div>
                  <span className="text-xs text-slate-400 font-semibold uppercase bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    Active Program
                  </span>
                </div>

                {/* Days and exercises */}
                <div className="space-y-6">
                  {plan.days.map((day: any) => (
                    <div key={day.id} className="space-y-3">
                      <h4 className="text-sm font-bold text-blue-600 flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        {day.dayOfWeek} ROUTINE
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {day.exercises.map((ex: any) => (
                          <div key={ex.id} className="bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-900/50 p-4 rounded-xl">
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{ex.name}</span>
                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 font-semibold">
                              <span>Set/Reps: <strong className="text-slate-600 dark:text-slate-300">{ex.sets} x {ex.reps}</strong></span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Rest: {ex.restTimeSeconds}s
                              </span>
                            </div>
                            {ex.notes && (
                              <p className="text-xs text-slate-400 mt-2 bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-900/80">
                                <strong>Notes:</strong> {ex.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {workouts.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-10">No custom workout routines have been built for you yet.</p>
            )}
          </div>
        )
      )}

      {/* DIET PLAN TAB */}
      {activeTab === 'diet' && (
        dietsLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {diets.map((plan: any) => (
              <div key={plan.id} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-900 mb-6">
                  <div>
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Custom Diet Plan by Coach: {plan.trainer?.user?.firstName} {plan.trainer?.user?.lastName}</p>
                  </div>
                  <span className="text-xs text-slate-400 font-semibold uppercase bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    Active Diet
                  </span>
                </div>

                {/* Meals */}
                <div className="space-y-4">
                  {plan.meals.map((meal: any) => (
                    <div key={meal.id} className="flex flex-col md:flex-row md:items-center justify-between bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-900/50 gap-4">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-orange-500/10 dark:bg-orange-950/20 text-orange-500 flex items-center justify-center font-bold">
                          <Utensils className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm uppercase text-slate-800 dark:text-slate-200">{meal.mealType}</span>
                            <span className="text-xs text-slate-400 font-semibold">({meal.time})</span>
                          </div>
                          <p className="text-sm mt-1 font-medium text-slate-600 dark:text-slate-400">{meal.items}</p>
                        </div>
                      </div>

                      {/* Macros */}
                      <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 border-t md:border-t-0 pt-3 md:pt-0 border-slate-200 dark:border-slate-800">
                        <span className="flex items-center gap-1 text-orange-500">
                          <Flame className="h-4 w-4" />
                          {meal.calories} kcal
                        </span>
                        <span>P: {meal.protein}g</span>
                        <span>C: {meal.carbs}g</span>
                        <span>F: {meal.fat}g</span>
                        {meal.waterIntakeMl > 0 && (
                          <span className="flex items-center gap-0.5 text-blue-500">
                            <Droplet className="h-3.5 w-3.5" />
                            {meal.waterIntakeMl}ml
                          </span>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            ))}
            {diets.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-10">No custom nutrition meal charts have been assigned to you yet.</p>
            )}
          </div>
        )
      )}

    </div>
  );
}
