        return {
          id: s.id,
          active: found ? (found.active !== false) : false
        };
      })
    });
  };

  const handleUpdateClub = async () => {
    if (!editingClub) return;
    setSaving(true);

    try {
      const computedMapUrl = getEffectiveMapUrl(editForm) || "";

      const payload = {
        ...editForm,
        mapUrl: editForm.mapUrl.trim() ? editForm.mapUrl : computedMapUrl
      };

      const res = await fetch(`/api/admin/clubs/${editingClub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const detailMsg = errorData.message || errorData.error || `Código HTTP ${res.status}`;
        throw new Error(`No se pudo actualizar: ${detailMsg}`);
      }

      const data = await res.json();
      const updatedData = data.club || data;

      const sportUpdateResults = await Promise.all(
        editForm.sports.map(async (sportState) => {
          const sportRes = await fetch(`/api/admin/clubs/${editingClub.id}/sports`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sportId: sportState.id, active: sportState.active }),
          });

          if (!sportRes.ok) {
            const errorData = await sportRes.json().catch(() => ({}));
            const detailMsg = errorData.message || errorData.error || `Código HTTP ${sportRes.status}`;
            return { ok: false, sportId: sportState.id, detailMsg };
          }

          return { ok: true, sportId: sportState.id };
        })
      );

      const failedSportUpdates = sportUpdateResults.filter(result => !result.ok);
      if (failedSportUpdates.length > 0) {
        const details = failedSportUpdates.map(result => `deporte ${result.sportId}: ${result.detailMsg}`).join(", ");
        throw new Error(`El club se actualizó, pero no se pudieron guardar todos los deportes (${details}).`);
      }

      const refreshedSports = availableSportsList.map(s => {
        const match = editForm.sports.find(es => es.id === s.id);
        return { ...s, active: match ? match.active : false };
      });

      setClubs(prev => prev.map(c => c.id === editingClub.id ? { ...c, ...editForm, sports: refreshedSports, ...updatedData } : c));
      setEditingClub(null);

    } catch (err: any) {
      console.error("Error actualizando el club:", err);
      alert(err.message || "Error al actualizar los datos del club.");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = (text: string, clubId: number) => {
    navigator.clipboard.writeText(text);
    setCopiedLinkId(clubId);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const copyCode = (text: string, clubId: number) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(clubId);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  if (isLoading || loading) return <div className="p-10 text-center text-muted-foreground">Cargando panel de gestión...</div>;
  if (!isAdmin) return <div className="text-center py-20 text-muted-foreground"><Shield size={48} className="mx-auto mb-4" /> Acceso restringido</div>;

  const newClubGeneratedMapUrl = getEffectiveMapUrl(newClub);
  const editClubGeneratedMapUrl = getEffectiveMapUrl(editForm);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("adminTitle")}</h1>
          <p className="text-sm text-muted-foreground">{clubs.length} {t("clubsRegistered")}</p>
        </div>
        <button 
          onClick={() => setShowNewClub(!showNewClub)} 
          className="bg-primary text-primary-foreground hover:opacity-90 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
        >
          <Plus size={16} /> {t("newClub")}</button>