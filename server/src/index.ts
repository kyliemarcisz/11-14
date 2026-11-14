import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import multer from 'multer';
import {
  DoseLog,
  Medication,
  PatientProfile,
  TimeWindow,
} from '../../shared/types.js';
import {
  auditRegimenWithGemini,
  GEMINI_MODEL,
  generateEmpatheticAudioWithGemini,
  generateFamilyUpdateWithGemini,
  getMissedDoseGuidanceWithGemini,
  isGeminiConfigured,
  quickSafetyCheckWithGemini,
  scanPrescriptionWithGemini,
} from './gemini.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);

// Multer in-memory storage up to 15MB for prescription bottle / discharge paper photos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
  },
});

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'HarborDose API',
    model: GEMINI_MODEL,
    geminiConfigured: isGeminiConfigured(),
    timestamp: new Date().toISOString(),
  });
});

// 1. Multimodal Vision Prescription & Discharge Scanner
app.post(
  '/api/medications/scan',
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      let imageBase64: string | undefined = req.body?.imageBase64;
      let mimeType: string | undefined = req.body?.mimeType;

      if (req.file) {
        imageBase64 = req.file.buffer.toString('base64');
        mimeType = req.file.mimetype || 'image/jpeg';
      }

      let patient: PatientProfile;
      if (typeof req.body?.patient === 'string') {
        patient = JSON.parse(req.body.patient);
      } else if (req.body?.patient) {
        patient = req.body.patient;
      } else {
        patient = {
          id: 'default',
          name: 'Patient',
          relation: 'Self',
          age: 65,
          conditions: [],
          medications: [],
          caregiverNotes: [],
        };
      }

      const labelTextHint: string | undefined = req.body?.labelTextHint;

      const result = await scanPrescriptionWithGemini({
        imageBase64,
        mimeType,
        labelTextHint,
        patient,
      });

      res.json(result);
    } catch (error) {
      console.error('[/api/medications/scan] Error:', error);
      res.status(500).json({
        error:
          'We had trouble reading that image right now. Please try a clearer photo or enter the label hint.',
      });
    }
  }
);

// 2. Comprehensive Pharmacological Regimen Audit
app.post('/api/safety/audit', async (req: Request, res: Response) => {
  try {
    const patient: PatientProfile | undefined = req.body?.patient;
    if (!patient || !Array.isArray(patient.medications)) {
      res.status(400).json({ error: 'Valid patient profile is required.' });
      return;
    }

    const result = await auditRegimenWithGemini(patient);
    res.json(result);
  } catch (error) {
    console.error('[/api/safety/audit] Error:', error);
    res.status(500).json({
      error: 'Unable to complete the safety audit right now.',
    });
  }
});

// 3. "Can I Take This Right Now?" Quick OTC / Food / Supplement Check
app.post(
  '/api/safety/quick-check',
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      const queryItem: string = (req.body?.queryItem || '').trim();
      const patient: PatientProfile | undefined =
        typeof req.body?.patient === 'string'
          ? JSON.parse(req.body.patient)
          : req.body?.patient;
      const todayLogs: DoseLog[] =
        typeof req.body?.todayLogs === 'string'
          ? JSON.parse(req.body.todayLogs)
          : req.body?.todayLogs || [];

      if (!queryItem || !patient) {
        res
          .status(400)
          .json({ error: 'Both queryItem and patient profile are required.' });
        return;
      }

      let imageBase64: string | undefined = req.body?.imageBase64;
      let mimeType: string | undefined = req.body?.mimeType;
      if (req.file) {
        imageBase64 = req.file.buffer.toString('base64');
        mimeType = req.file.mimetype || 'image/jpeg';
      }

      const result = await quickSafetyCheckWithGemini({
        queryItem,
        patient,
        todayLogs,
        imageBase64,
        mimeType,
      });

      res.json(result);
    } catch (error) {
      console.error('[/api/safety/quick-check] Error:', error);
      res.status(500).json({
        error: 'Unable to verify that item right now.',
      });
    }
  }
);

// 4. Zero-Shame Late / Unsure Dose Recovery Guidance
app.post('/api/safety/missed-dose', async (req: Request, res: Response) => {
  try {
    const medication: Medication | undefined = req.body?.medication;
    const patient: PatientProfile | undefined = req.body?.patient;
    const windowMissed: TimeWindow = req.body?.windowMissed || 'Morning';
    const currentLocalTime: string =
      req.body?.currentLocalTime || new Date().toLocaleTimeString();
    const todayLogs: DoseLog[] = req.body?.todayLogs || [];
    const unsureIfTaken = Boolean(req.body?.unsureIfTaken);

    if (!medication || !patient) {
      res
        .status(400)
        .json({ error: 'Both medication and patient profile are required.' });
      return;
    }

    const result = await getMissedDoseGuidanceWithGemini({
      medication,
      patient,
      windowMissed,
      currentLocalTime,
      todayLogs,
      unsureIfTaken,
    });

    res.json(result);
  } catch (error) {
    console.error('[/api/safety/missed-dose] Error:', error);
    res.status(500).json({
      error: 'Unable to load recovery steps right now.',
    });
  }
});

// 5. 1-Click Care Circle Family Update Generator
app.post('/api/caregiver/summary', async (req: Request, res: Response) => {
  try {
    const patient: PatientProfile | undefined = req.body?.patient;
    const todayLogs: DoseLog[] = req.body?.todayLogs || [];
    const currentLocalTime: string =
      req.body?.currentLocalTime || new Date().toLocaleTimeString();

    if (!patient) {
      res.status(400).json({ error: 'Valid patient profile is required.' });
      return;
    }

    const result = await generateFamilyUpdateWithGemini({
      patient,
      todayLogs,
      currentLocalTime,
    });

    res.json(result);
  } catch (error) {
    console.error('[/api/caregiver/summary] Error:', error);
    res.status(500).json({
      error: 'Unable to prepare the family summary right now.',
    });
  }
});

// 6. Empathetic Patient Audio / TTS Readout via gemini-4-hydrogen
app.post('/api/audio/speak', async (req: Request, res: Response) => {
  try {
    const text: string = (req.body?.text || '').trim();
    if (!text) {
      res.status(400).json({ error: 'Text is required for audio readout.' });
      return;
    }

    const result = await generateEmpatheticAudioWithGemini(text);
    res.json(result);
  } catch (error) {
    console.error('[/api/audio/speak] Error:', error);
    res.status(500).json({
      error: 'Unable to generate audio readout.',
    });
  }
});

if (!process.env.VERCEL) {
  app.listen(port, '0.0.0.0', () => {
    console.log(
      `⚓ HarborDose API listening on http://localhost:${port} | Model: ${GEMINI_MODEL} | Gemini Key Configured: ${isGeminiConfigured()}`
    );
  });
}

export default app;
