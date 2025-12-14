-- 1. Create the Table
CREATE TABLE IF NOT EXISTS nodes (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 0, -- Leaves = 1-10, Parents = Sum of children
    deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Index for faster recursive lookups
CREATE INDEX idx_parent_id ON nodes(parent_id);

-- 3. LOGIC: Priority Bubble Up Trigger
-- When a child changes priority, sum all siblings and update the parent.
CREATE OR REPLACE FUNCTION update_parent_priority() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_id IS NOT NULL THEN
        UPDATE nodes 
        SET priority = (
            SELECT COALESCE(SUM(priority), 0) 
            FROM nodes 
            WHERE parent_id = NEW.parent_id AND is_completed = FALSE
        )
        WHERE id = NEW.parent_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_priority_bubble
AFTER INSERT OR UPDATE OF priority, is_completed, parent_id ON nodes
FOR EACH ROW
EXECUTE FUNCTION update_parent_priority();


-- 4. LOGIC: Completion Bubble Up Trigger
-- When a child is completed, check if all siblings are done. If so, complete parent.
CREATE OR REPLACE FUNCTION check_parent_completion() 
RETURNS TRIGGER AS $$
DECLARE
    all_siblings_done BOOLEAN;
BEGIN
    IF NEW.parent_id IS NOT NULL AND NEW.is_completed = TRUE THEN
        -- Check if there are any siblings that are NOT done
        SELECT NOT EXISTS (
            SELECT 1 FROM nodes 
            WHERE parent_id = NEW.parent_id AND is_completed = FALSE
        ) INTO all_siblings_done;

        -- If all are done, mark parent as done
        IF all_siblings_done THEN
            UPDATE nodes SET is_completed = TRUE WHERE id = NEW.parent_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_completion_bubble
AFTER UPDATE OF is_completed ON nodes
FOR EACH ROW
EXECUTE FUNCTION check_parent_completion();
