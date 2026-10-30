ALTER TABLE media_edit ADD COLUMN setup_captions TEXT NOT NULL DEFAULT '';
ALTER TABLE media_edit ADD COLUMN reveal_captions TEXT NOT NULL DEFAULT '';
ALTER TABLE media_edit ADD COLUMN setup_transcript TEXT NOT NULL DEFAULT '';
ALTER TABLE media_edit ADD COLUMN reveal_transcript TEXT NOT NULL DEFAULT '';
CREATE TRIGGER immutable_edit_alternatives BEFORE UPDATE ON media_edit
WHEN NEW.setup_captions <> OLD.setup_captions OR NEW.reveal_captions <> OLD.reveal_captions
 OR NEW.setup_transcript <> OLD.setup_transcript OR NEW.reveal_transcript <> OLD.reveal_transcript
BEGIN SELECT RAISE(ABORT,'media alternatives require a new edit revision'); END;
