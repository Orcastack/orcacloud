import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Chip,
  IconButton,
  Typography,
  Avatar,
} from '@mui/material';
import { Close, Add } from '@mui/icons-material';
import { CommunityMember } from '../../types/auth';

interface EditProfileDialogProps {
  open: boolean;
  onClose: () => void;
  member: CommunityMember | null;
  onSave: (updatedMember: CommunityMember) => void;
}

const EditProfileDialog: React.FC<EditProfileDialogProps> = ({
  open,
  onClose,
  member,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    bio: '',
    skills: [] as string[],
    github_url: '',
    linkedin_url: '',
  });
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    if (member) {
      setFormData({
        first_name: member.user.first_name,
        last_name: member.user.last_name,
        bio: member.user.bio || '',
        skills: member.user.skills || [],
        github_url: member.user.github_url || '',
        linkedin_url: member.user.linkedin_url || '',
      });
    }
  }, [member]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }));
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove),
    }));
  };

  const handleSave = () => {
    if (member) {
      const updatedMember: CommunityMember = {
        ...member,
        user: {
          ...member.user,
          first_name: formData.first_name,
          last_name: formData.last_name,
          bio: formData.bio,
          skills: formData.skills,
          github_url: formData.github_url,
          linkedin_url: formData.linkedin_url,
        },
      };
      onSave(updatedMember);
      onClose();
    }
  };

  const handleClose = () => {
    setFormData({
      first_name: '',
      last_name: '',
      bio: '',
      skills: [],
      github_url: '',
      linkedin_url: '',
    });
    setNewSkill('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar src={member?.user.avatar}>
            {member?.user.first_name[0]}
          </Avatar>
          <Typography variant="h6">Edit Profile</Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="First Name"
              value={formData.first_name}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
            />
            <TextField
              fullWidth
              label="Last Name"
              value={formData.last_name}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
            />
          </Box>

          <TextField
            fullWidth
            label="Bio"
            multiline
            rows={3}
            value={formData.bio}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            placeholder="Tell us about yourself..."
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Skills
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {formData.skills.map((skill) => (
                <Chip
                  key={skill}
                  label={skill}
                  onDelete={() => handleRemoveSkill(skill)}
                  size="small"
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Add a skill..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={handleAddSkill}
                disabled={!newSkill.trim()}
              >
                <Add />
              </Button>
            </Box>
          </Box>

          <TextField
            fullWidth
            label="GitHub URL"
            value={formData.github_url}
            onChange={(e) => handleInputChange('github_url', e.target.value)}
            placeholder="https://github.com/username"
          />

          <TextField
            fullWidth
            label="LinkedIn URL"
            value={formData.linkedin_url}
            onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
            placeholder="https://linkedin.com/in/username"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditProfileDialog;