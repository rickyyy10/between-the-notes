"""Two-recording pilot. Automatic drafts, not a reference transcription.
Basic Pitch's official ONNX model vs librosa pYIN + documented segmentation.
No key, meter, chords, lyrics alignment or note accuracy is inferred.
"""
from pathlib import Path
import os, json, csv, hashlib, sys
ROOT=Path(__file__).resolve().parents[1]
DEMO=ROOT.parents[1]/'dist'
OUT=DEMO/'transcription'
CACHE=ROOT/'.cache'
os.environ.setdefault('NUMBA_CACHE_DIR',str(CACHE/'numba'))
os.environ.setdefault('MPLCONFIGDIR',str(CACHE/'matplotlib'))
import numpy as np
import librosa, soundfile as sf, pretty_midi
from scipy.ndimage import median_filter
from basic_pitch import ICASSP_2022_MODEL_PATH
from basic_pitch.inference import predict, Model
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

SR=22050; HOP=256
OUT.mkdir(parents=True,exist_ok=True)
(CACHE/'activations').mkdir(parents=True,exist_ok=True)
model=Model(ICASSP_2022_MODEL_PATH)

def segments(f0,valid):
    # Smooth within voiced runs only. Quantize to nearest A440 semitone.
    # Split on a changed rounded pitch; drop runs <100 ms; merge equal notes
    # across gaps <=80 ms. This is a baseline heuristic, not Tony's note model.
    midi=np.full(len(f0),-1,dtype=int)
    a=0
    while a<len(f0):
        if not valid[a]:a+=1;continue
        b=a+1
        while b<len(f0) and valid[b]:b+=1
        midi[a:b]=np.rint(median_filter(librosa.hz_to_midi(f0[a:b]),size=5,mode='nearest')).astype(int)
        a=b
    events=[];a=0
    while a<len(midi):
        b=a+1
        while b<len(midi) and midi[b]==midi[a]:b+=1
        start=max(0,(a-.5)*HOP/SR);end=(b-.5)*HOP/SR
        if midi[a]>=0 and end-start>=.1:
            ev={'start':start,'end':end,'midi':int(midi[a]),'strength':None}
            if events and events[-1]['midi']==ev['midi'] and ev['start']-events[-1]['end']<=.08:events[-1]['end']=ev['end']
            else:events.append(ev)
        a=b
    return events

def synth(events,duration):
    y=np.zeros(round(duration*SR),dtype=np.float64)
    for e in events:
        a=max(0,round(e['start']*SR));b=min(len(y),round(e['end']*SR));n=b-a
        if n<=0:continue
        t=np.arange(n)/SR;f=440*2**((e['midi']-69)/12)
        env=np.ones(n);r=min(round(.015*SR),n//2)
        if r:env[:r]=np.linspace(0,1,r);env[-r:]=np.linspace(1,0,r)
        y[a:b]+=.18*env*(np.sin(2*np.pi*f*t)+.15*np.sin(4*np.pi*f*t))
    peak=np.max(np.abs(y))
    if peak>.9:y*=.9/peak
    return y

def jianpu(p):
    label=['1','♯1','2','♯2','3','4','♯4','5','♯5','6','♯6','7'][p%12]
    octave=p//12-5
    return label+('·'*octave if octave>0 else '̣'*(-octave))

def export(events,id,name,duration):
    mid=pretty_midi.PrettyMIDI(initial_tempo=120)
    inst=pretty_midi.Instrument(0,name=name)
    for e in events:
        inst.notes.append(pretty_midi.Note(90,e['midi'],e['start'],min(e['end'],duration)))
    mid.instruments.append(inst);mid.write(str(OUT/f'{id}-{name}.mid'))
    with (OUT/f'{id}-{name}.csv').open('w') as f:
        writer=csv.writer(f);writer.writerow(['start_seconds','end_seconds','duration_seconds','midi','note_A440','display_degree_1=C4','model_activation_not_probability'])
        for e in events:writer.writerow([round(e['start'],4),round(e['end'],4),round(e['end']-e['start'],4),e['midi'],librosa.midi_to_note(e['midi']),jianpu(e['midi']),e['strength']])
    sf.write(OUT/f'{id}-{name}.wav',synth(events,duration),SR,subtype='PCM_16')

def run(id):
    path=DEMO/'audio'/f'{id}.mp3'
    print('PROCESS',id,flush=True)
    y,sr=librosa.load(path,sr=SR,mono=True);duration=len(y)/SR
    npz=CACHE/'activations'/f'{id}-basic-pitch.npz'
    output,midi,raw=predict(path,model,minimum_note_length=127.7)
    np.savez_compressed(npz,**output)
    midi.write(str(OUT/f'{id}-basic-pitch-with-bends.mid'))
    bp=sorted([{'start':max(0,float(a)),'end':min(duration,float(b)),'midi':int(p),'strength':round(float(v),4)} for a,b,p,v,_ in raw if a<duration and b>a],key=lambda e:(e['start'],e['midi']))
    f0,voiced,prob=librosa.pyin(y,sr=SR,fmin=float(librosa.note_to_hz('C2')),fmax=float(librosa.note_to_hz('C6')),frame_length=2048,hop_length=HOP)
    valid=voiced & np.isfinite(f0) & (prob>=.1)
    py=segments(f0,valid)
    for e in py:e['end']=min(duration,e['end'])
    times=np.arange(len(f0))*HOP/SR
    # Compare overlapping estimates; agreement with pYIN is NOT accuracy.
    differences=[];poly=0;covered=0;voice_covered=0;bp_time=0
    for t,hz,v in zip(times,f0,valid):
        notes=[e['midi'] for e in bp if e['start']<=t<e['end']]
        if notes:bp_time+=1
        if len(notes)>1:poly+=1
        if v:
            covered+=1
            if notes:
                voice_covered+=1;differences.append(min(abs(p-float(librosa.hz_to_midi(hz))) for p in notes))
    stats={'duration':round(duration,3),'pyin_notes':len(py),'basic_pitch_notes':len(bp),'basic_pitch_simultaneous_note_fraction':round(poly/len(times),4),'basic_pitch_coverage_of_pyin_voiced_frames':round(voice_covered/max(covered,1),4),'nearest_basic_pitch_note_within_50_cents_on_joint_frames':round(float(np.mean(np.array(differences)<=.5)),4) if differences else None,'median_nearest_pitch_difference_cents':round(float(np.median(differences))*100,1) if differences else None,'pyin_note_range':[min(e['midi'] for e in py),max(e['midi'] for e in py)],'basic_pitch_note_range':[min(e['midi'] for e in bp),max(e['midi'] for e in bp)]}
    for name,events in [('pyin',py),('basic-pitch',bp)]:export(events,id,name,duration)
    frames=[{'t':round(float(t),4),'hz':round(float(hz),3) if v else None} for t,hz,v in zip(times[::2],f0[::2],valid[::2])]
    record={'id':id,'stats':stats,'frames':frames,'pyin':py,'basic-pitch':bp}
    plot(record)
    print(json.dumps(stats),flush=True)
    return record

def plot(r):
    fig,axs=plt.subplots(3,1,figsize=(14,7),sharex=True,layout='constrained')
    t=np.array([f['t'] for f in r['frames']]);p=np.array([69+12*np.log2(f['hz']/440) if f['hz'] else np.nan for f in r['frames']])
    axs[0].plot(t,p,color='#176e64',lw=1);axs[0].set_title('pYIN continuous pitch (A=440 reference) — gaps are unvoiced / uncertain',loc='left',fontsize=10)
    for ax,key,title in [(axs[1],'pyin','pYIN + heuristic segmentation (100 ms minimum)'),(axs[2],'basic-pitch','Basic Pitch 0.4.0 — raw polyphonic notes (127.7 ms minimum)')]:
        for e in r[key]:ax.broken_barh([(e['start'],e['end']-e['start'])],(e['midi']-.32,.64),facecolors='#176e64' if key=='pyin' else '#ce684d')
        ax.set_title(title,loc='left',fontsize=10)
    allp=[e['midi'] for k in ['pyin','basic-pitch'] for e in r[k]]
    low=min(allp)-2;high=max(allp)+2
    for ax in axs:
        ax.set_ylim(low,high);ax.set_xlim(0,r['stats']['duration']);ticks=list(range((low//12)*12,high+1,6));ax.set_yticks(ticks,[librosa.midi_to_note(x) for x in ticks]);ax.grid(alpha=.18);ax.set_ylabel('Pitch')
    axs[-1].set_xlabel('Original recording time (seconds)')
    fig.suptitle(r['id']+' | Automatic transcription comparison — not manually verified',fontsize=14)
    fig.savefig(OUT/f"{r['id']}-comparison.png",dpi=160);plt.close(fig)

if __name__=='__main__':
    result={'schema':1,'reference':'Display reference 1=C4, A4=440 Hz. NOT an estimated tonic/key. Seconds are retained; no meter or beat quantization. MIDI tempo 120 is only a file timebase.','methods':{'basic-pitch':{'version':'0.4.0','backend':'ONNX','model_sha256':hashlib.sha256(Path(ICASSP_2022_MODEL_PATH).read_bytes()).hexdigest(),'onset_threshold':.5,'frame_threshold':.3,'minimum_note_length_ms':127.7,'pitch_range':'unrestricted model defaults','melodia_trick':True},'pyin':{'implementation':'librosa '+librosa.__version__,'sample_rate':SR,'frame_length':2048,'hop_length':HOP,'fmin':'C2','fmax':'C6','voiced_probability_min':.1,'note_segmentation':'5-frame median within voiced runs; round A440 semitones; remove runs <100ms; merge equal pitches across gaps <=80ms','not_tony':True}},'records':[run(x) for x in ['ecura-0118','ecura-0119']]}
    (OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
