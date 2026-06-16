DROP TRIGGER IF EXISTS tr_prevent_self_vote ON votes;
CREATE TRIGGER tr_prevent_self_vote
BEFORE INSERT ON votes
FOR EACH ROW EXECUTE FUNCTION check_prevent_self_vote();